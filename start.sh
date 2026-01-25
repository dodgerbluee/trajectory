#!/bin/bash
# Start Trajectory via Docker

set -e

if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. See https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Docker Compose is not installed. See https://docs.docker.com/compose/install/"
    exit 1
fi

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        if command -v openssl &> /dev/null; then
            RANDOM_PASSWORD=$(openssl rand -base64 24)
            sed -i.bak "s/development_password/$RANDOM_PASSWORD/" .env 2>/dev/null && rm -f .env.bak || true
        fi
    else
        echo "Create a .env file with DB_PASSWORD (or use .env.example as template)."
        exit 1
    fi
fi

echo "Starting containers..."
docker-compose up -d

echo "Waiting for database..."
sleep 5
for i in {1..30}; do
    if docker-compose ps 2>/dev/null | grep -q "Up (healthy)"; then
        echo ""
        echo "Trajectory is running."
        echo "  Frontend: http://localhost:3000"
        echo "  Backend:  http://localhost:3000/api"
        echo "  Logs:     docker-compose logs -f"
        exit 0
    fi
    echo -n "."
    sleep 2
done

echo ""
echo "Containers may still be starting. Check: docker-compose logs -f"

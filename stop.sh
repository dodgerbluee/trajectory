#!/bin/bash
set -e
docker-compose stop
echo "Stopped. Run ./start.sh to start again. Use 'docker-compose down -v' to remove data."

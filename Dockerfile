# Multi-stage build for unified container (frontend + backend)
# Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build arguments for frontend
ARG VITE_API_URL=""
ARG VITE_BASE_PATH=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BASE_PATH=$VITE_BASE_PATH

# Build frontend
RUN npm run build

# Build backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm install

# Copy backend source
COPY backend/ ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy backend package files and install production dependencies
COPY --from=backend-builder /app/backend/package*.json ./
RUN npm install --omit=dev

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy migrations directory (needed at runtime)
COPY --from=backend-builder /app/backend/migrations ./migrations

# Copy scripts directory (for seeding, etc.)
COPY --from=backend-builder /app/backend/dist/scripts ./dist/scripts

# Copy frontend build to public directory
COPY --from=frontend-builder /app/frontend/dist ./public

# Copy entrypoint script
COPY --from=backend-builder /app/backend/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Install su-exec for user switching
RUN apk add --no-cache su-exec

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create directories for uploads and avatars
RUN mkdir -p /app/uploads /app/avatars && \
    chown -R nodejs:nodejs /app

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Environment variables
ENV FRONTEND_DIR=public
ENV NODE_ENV=production

# Use entrypoint to fix permissions at runtime
ENTRYPOINT ["docker-entrypoint.sh"]

# Start application
CMD ["node", "dist/index.js"]

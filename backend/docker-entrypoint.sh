#!/bin/sh
set -e

# Ensure uploads directory exists and has correct permissions
mkdir -p /app/uploads
chown -R nodejs:nodejs /app/uploads

# Ensure avatars directory exists and has correct permissions
mkdir -p /app/avatars
chown -R nodejs:nodejs /app/avatars

# Switch to nodejs user and run the application
exec su-exec nodejs "$@"

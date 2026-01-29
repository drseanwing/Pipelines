# Use Node.js LTS version
FROM node:20-slim

# Install git and bash (required for ralph's git operations and shell scripts)
RUN apt-get update && \
    apt-get install -y git bash && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Use --omit=dev (newer preferred syntax)
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Create volume mount points for persistent data
# These will be used by named volumes in compose.yaml
VOLUME ["/app/.ralph", "/app/.agents/tasks"]

# Set environment variables
ENV NODE_ENV=production

# Expose port if needed (for skills like dev-browser)
EXPOSE 3000

# Default command - show help
CMD ["node", "bin/ralph", "--help"]

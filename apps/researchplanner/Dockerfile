# QI Research Pipeline - Application Dockerfile (pnpm workspace)
# Build context must be the monorepo root: ../../
# Build with: docker build -f apps/researchplanner/Dockerfile -t qi-app .

# =============================================================================
# Stage 1: Builder
# =============================================================================
FROM node:20-alpine AS builder

# Install pnpm and build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && corepack enable \
    && corepack prepare pnpm@9 --activate

# Set working directory to monorepo root
WORKDIR /monorepo

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all workspace packages that researchplanner depends on
COPY packages/core/checkpoint ./packages/core/checkpoint
COPY packages/core/config ./packages/core/config
COPY packages/core/database ./packages/core/database
COPY packages/core/llm-client ./packages/core/llm-client
COPY packages/core/logging ./packages/core/logging
COPY packages/core/pubmed ./packages/core/pubmed
COPY packages/core/retry ./packages/core/retry
COPY packages/core/validation ./packages/core/validation

# Copy researchplanner app
COPY apps/researchplanner ./apps/researchplanner

# Install dependencies using pnpm
# Note: Remove --frozen-lockfile temporarily to allow adding missing @types/node
RUN pnpm install

# Build all packages and the app
RUN pnpm --filter "@pipelines/*" build
RUN pnpm --filter qi-research-pipeline build

# Prune dev dependencies and create a clean production install
RUN pnpm --filter qi-research-pipeline --prod deploy /app

# =============================================================================
# Stage 2: Runtime
# =============================================================================
FROM node:20-alpine AS runtime

# Install runtime dependencies and security updates
RUN apk add --no-cache \
    dumb-init \
    curl \
    && apk upgrade --no-cache

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy production dependencies and built artifacts from builder
COPY --from=builder --chown=appuser:appgroup /app ./

# Create directories for runtime data
RUN mkdir -p /app/data /app/logs /app/output && \
    chown -R appuser:appgroup /app/data /app/logs /app/output

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://127.0.0.1:3000/health || exit 1

# Use dumb-init to handle PID 1 properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

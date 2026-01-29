# =============================================================================
# Dev Container Dockerfile
# =============================================================================

FROM mcr.microsoft.com/devcontainers/python:3.11

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python tools
RUN pip install --no-cache-dir \
    pre-commit \
    commitizen

# Create log directory
RUN mkdir -p /var/log/app

# Set working directory
WORKDIR /workspace

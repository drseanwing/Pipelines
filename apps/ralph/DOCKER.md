# Docker Setup for Ralph

This directory contains Docker configuration for containerizing Ralph.

## Files

- `Dockerfile` - Container image definition with Node.js runtime and dependencies
- `compose.yaml` - Docker Compose configuration with named volumes
- `.dockerignore` - Excludes unnecessary files from the image

## Prerequisites

- Docker 20.10+ or compatible OCI runtime
- Docker Compose v2+ (included with Docker Desktop)
- Works with rootless Docker configurations

## Building the Image

```bash
docker build -t ralph .
```

## Using Docker Compose

### Run Ralph commands:

```bash
# Show help
docker compose run --rm ralph node bin/ralph --help

# Generate a PRD
docker compose run --rm ralph node bin/ralph prd

# Run a build iteration
docker compose run --rm ralph node bin/ralph build 1
```

### Interactive shell:

```bash
docker compose run --rm ralph bash
```

## Named Volumes

The setup uses named volumes for persistence, which are compatible with rootless Docker:

- `ralph-state` - Persistent Ralph state (`.ralph/` directory)
  - progress.md - Progress log
  - guardrails.md - Lessons learned
  - activity.log - Activity and timing
  - errors.log - Failure tracking
  - runs/ - Run logs and summaries

- `ralph-tasks` - Task definitions (`.agents/tasks/` directory)
  - PRD JSON files

**Note:** Docker Compose prefixes volume names with the project directory name. For example, if your project directory is named `ralph`, the volumes will be `ralph_ralph-state` and `ralph_ralph-tasks`.

### Managing Volumes

```bash
# List volumes
docker volume ls | grep ralph

# Inspect a volume (replace PROJECT_NAME with your actual project directory name)
docker volume inspect PROJECT_NAME_ralph-state

# Back up a volume (replace PROJECT_NAME accordingly)
docker run --rm -v PROJECT_NAME_ralph-state:/data -v $(pwd):/backup ubuntu tar czf /backup/ralph-state-backup.tar.gz -C /data .

# Restore a volume (replace PROJECT_NAME accordingly)
docker run --rm -v PROJECT_NAME_ralph-state:/data -v $(pwd):/backup ubuntu tar xzf /backup/ralph-state-backup.tar.gz -C /data

# Remove volumes (caution: deletes data)
docker compose down -v
```

## Rootless Docker Compatibility

Named volumes work correctly with rootless Docker because:
- Docker manages volume permissions automatically
- No host UID/GID mapping issues
- Volumes are stored in user-accessible locations
- Compatible with user namespace remapping

## Development Mode

For local development with live code editing, use the development override:

```bash
# Use both compose files
docker compose -f compose.yaml -f compose.dev.yaml run --rm ralph bash

# Or set COMPOSE_FILE environment variable
export COMPOSE_FILE=compose.yaml:compose.dev.yaml
docker compose run --rm ralph node bin/ralph build 1
```

The development override adds a bind mount of the repository, allowing you to:
- Edit code on the host
- Changes reflect immediately in the container
- Named volumes still preserve state correctly

**Note:** Bind mounts may have permission issues with rootless Docker. The production `compose.yaml` avoids this by using only named volumes.

## Network Access

The container uses bridge networking mode, allowing access to:
- External APIs
- Agent services (codex, claude, droid, opencode)
- GitHub for git operations

## Environment Variables

Set environment variables in `compose.yaml` or via CLI:

```bash
docker compose run --rm -e AGENT_CMD="codex exec --yolo -" ralph node bin/ralph build 1
```

## Troubleshooting

### Permission Issues
If you encounter permission issues, the named volumes should handle this automatically. For bind mounts, ensure your user has proper permissions.

### Network Issues
If agents can't reach external services, check:
```bash
docker compose run --rm ralph ping -c 3 google.com
```

### Volume Data
To inspect volume contents:
```bash
docker compose run --rm ralph ls -la .ralph/
docker compose run --rm ralph ls -la .agents/tasks/
```

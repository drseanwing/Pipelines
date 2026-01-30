# Network Topology

## Docker Networks

| Network | Purpose | Connected Services |
|---------|---------|-------------------|
| shared | Core infrastructure | PostgreSQL, Redis, Ollama |
| foam-internal | FOAM app isolation | foam-n8n, shared services |
| qi-internal | QI app isolation | qi-n8n, qi-app, shared services |
| slr-internal | SLR app isolation | slr-n8n, slr-worker, i-librarian, shared services |
| monitoring | Metrics collection | Prometheus, all services |

## Service Communication Matrix

| From \ To | PostgreSQL | Redis | Ollama | foam-n8n | qi-n8n | qi-app | slr-n8n | slr-worker | i-librarian |
|-----------|-----------|-------|--------|----------|--------|--------|---------|------------|-------------|
| foam-n8n | Yes | Yes | Yes | - | No | No | No | No | No |
| qi-n8n | Yes | Yes | Yes | No | - | Yes | No | No | No |
| qi-app | Yes | Yes | No | No | Yes | - | No | No | No |
| slr-n8n | Yes | Yes | Yes | No | No | No | - | Yes | Yes |
| slr-worker | Yes | Yes | Yes | No | No | No | Yes | - | No |
| Prometheus | No | No | No | Yes | Yes | Yes | Yes | Yes | No |

## Network Isolation Rules

1. **No cross-project access**: foam services cannot reach qi or slr services directly
2. **Shared services only via shared network**: All projects access PostgreSQL/Redis/Ollama through the shared network
3. **Monitoring is read-only**: Prometheus scrapes metrics but cannot modify services
4. **External access**: Only mapped ports (5810-5850) are accessible from host

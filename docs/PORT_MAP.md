# Port Allocation Map (5810-5850)

## Shared Infrastructure (5810-5814)

| Port | Service | Internal Port | Notes |
|------|---------|---------------|-------|
| 5810 | PostgreSQL (pgvector/pg16) | 5432 | Single instance, 3 schemas: foam, qi, slr |
| 5811 | Redis 7 Alpine | 6379 | Key-prefixed per app (foam:*, qi:*, slr:*) |
| 5812 | Ollama | 11434 | Shared GPU instance |
| 5813 | Prometheus | 9090 | Monorepo-wide metrics |
| 5814 | Grafana | 3000 | Unified dashboards |

## FOAM Services (5815-5819)

| Port | Service | Internal Port | Notes |
|------|---------|---------------|-------|
| 5815 | n8n (foam) | 5678 | FOAM workflow orchestration |
| 5816-5819 | Reserved | - | Future foam services |

## ResearchPlanner/QI Services (5820-5829)

| Port | Service | Internal Port | Notes |
|------|---------|---------------|-------|
| 5820 | n8n (qi-pipeline) | 5678 | QI workflow orchestration |
| 5821 | Express API app | 3000 | QI pipeline application |
| 5822 | Node.js debugger | 9229 | Dev only |
| 5823 | Adminer | 8080 | Dev only - DB management |
| 5824 | Redis Commander | 8081 | Dev only |
| 5825 | MailHog Web | 8025 | Dev only - email testing |
| 5826 | MailHog SMTP | 1025 | Dev only |
| 5827-5829 | Reserved | - | Future QI services |

## CritLit/SLR Services (5830-5839)

| Port | Service | Internal Port | Notes |
|------|---------|---------------|-------|
| 5830 | n8n (slr) | 5678 | SLR workflow orchestration |
| 5831 | n8n-worker | - | Queue worker (no external port needed) |
| 5832 | I-Librarian | 80 | PDF management |
| 5833 | n8n-mcp | - | MCP stdio (no external port) |
| 5834-5839 | Reserved | - | Future SLR services |

## Monitoring & DevOps (5840-5850)

| Port | Service | Internal Port | Notes |
|------|---------|---------------|-------|
| 5840 | Node Exporter | 9100 | Host metrics |
| 5841 | Postgres Exporter | 9187 | DB metrics |
| 5842 | cAdvisor | 8080 | Container metrics |
| 5843-5850 | Reserved | - | Future monitoring/tools |

# ADR-002: Single PostgreSQL Instance with Per-Project Schemas

## Status
Accepted

## Date
2026-01-30

## Context
The three projects currently use different PostgreSQL versions (14, 15, 16). We need to decide between separate instances or a unified instance.

## Decision
**Single PostgreSQL 16 instance with pgvector extension**, using separate schemas per project: `foam`, `qi`, `slr`.

## Rationale
- **Resource Efficiency**: One PG instance uses ~256MB base vs ~768MB for three
- **pgvector Superset**: PostgreSQL 16 with pgvector is a superset of all features needed (14, 15 compatibility confirmed)
- **Backup Simplification**: Single pg_dump covers all project data
- **Schema Isolation**: PostgreSQL schemas provide namespace isolation equivalent to separate databases
- **Cross-Project Queries**: Future analytics can JOIN across schemas if needed

## Consequences
- All projects must use schema-qualified table names (e.g., `foam.documents`, `qi.projects`, `slr.reviews`)
- Single point of failure for all projects (mitigated by backup strategy)
- Must validate all existing init scripts against PG16
- Per-project DB users with schema-specific GRANT statements required

## Alternatives Considered
1. **Separate PostgreSQL instances**: Rejected - excessive resource usage, backup complexity
2. **Separate databases in one instance**: Rejected - cross-database queries impossible, no advantage over schemas

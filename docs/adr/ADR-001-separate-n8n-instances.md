# ADR-001: Separate N8N Instances Per Project

## Status
Accepted

## Date
2026-01-30

## Context
The monorepo consolidates three N8N-dependent projects (foam, researchplanner, critlit). We must decide whether to run a single shared N8N instance or separate instances per project.

## Decision
**Separate N8N instances per project** (one for foam, one for researchplanner/QI, one for critlit/SLR).

## Rationale
- **Isolation**: Workflow failures in one project don't cascade to others
- **Credential Security**: Each instance has its own encryption key - no cross-project credential access
- **Resource Management**: Independent queue processing prevents one project's heavy workflows from blocking another
- **Upgrade Independence**: Each project can update N8N versions independently if needed
- **Port Separation**: Clean port allocation (foam:5815, qi:5820, slr:5830)

## Consequences
- Higher memory usage (~300MB per instance, ~900MB total vs ~400MB shared)
- Three sets of credentials to manage
- Redis queue isolation required (separate QUEUE_BULL_REDIS_DB per instance)

## Alternatives Considered
1. **Single shared instance**: Rejected - credential isolation impossible, workflow namespace collisions likely
2. **Two instances** (foam+critlit share, researchplanner separate): Rejected - foam and critlit have different workflow patterns

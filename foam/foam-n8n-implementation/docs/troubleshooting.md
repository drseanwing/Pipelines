# FOAM N8N Troubleshooting Guide

**Version:** 1.0.0
**Last Updated:** 2025-01-25
**Status:** Core content complete, advanced sections pending Iteration 12

---

## Overview

This document provides troubleshooting guidance for common issues in the FOAM N8N Multi-LLM Orchestration system.

---

## Common Issues

### N8N Service Issues

#### N8N won't start
```bash
# Check container logs
docker-compose logs n8n

# Verify PostgreSQL is running
docker-compose ps postgres

# Restart services
docker-compose restart n8n
```

#### Webhook not receiving requests
- Verify `WEBHOOK_URL` environment variable is set correctly
- Check firewall/port forwarding for port 5678
- Ensure N8N_HOST matches your domain

---

### Database Issues

#### PostgreSQL connection failed
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify credentials in .env match docker-compose.yml
# Restart PostgreSQL
docker-compose restart postgres
```

#### Database initialization failed
- Check `config/postgres-init.sql` for syntax errors
- Verify volume permissions
- Remove volume and reinitialize: `docker-compose down -v && docker-compose up -d`

---

### Ollama Issues

#### Ollama not responding
```bash
# Check Ollama service status
docker-compose logs ollama

# Verify Ollama is accessible
curl http://localhost:11434/api/tags
```

#### Model not found
```bash
# Pull required models
docker exec ollama ollama pull llama3.2
docker exec ollama ollama pull mistral

# Verify models are available
docker exec ollama ollama list
```

#### GPU not detected
- Verify NVIDIA drivers installed: `nvidia-smi`
- Check NVIDIA Container Toolkit: `docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi`
- For CPU-only operation, remove GPU reservation from docker-compose.yml

---

### LLM API Issues

#### Claude API errors
- Verify `ANTHROPIC_API_KEY` is valid
- Check API rate limits on Anthropic dashboard
- Review error response for specific issue

#### GPT-4o API errors
- Verify `OPENAI_API_KEY` is valid
- Check API rate limits on OpenAI dashboard
- Ensure SerpAPI key is configured for web search features

---

### Workflow Issues

#### Workflow execution fails
1. Check N8N execution logs (Settings > Executions)
2. Verify all credentials are configured
3. Test individual nodes in workflow
4. Check error handling nodes are connected

#### Schema validation errors
- Review input against JSON schemas in `schemas/` directory
- Use `code/validators/schema-validator.js` to debug

---

## Error Codes Reference

| Code | Description | Resolution |
|------|-------------|------------|
| `ERR_DB_CONNECTION` | PostgreSQL connection failed | Check database credentials and service status |
| `ERR_LLM_TIMEOUT` | LLM API request timed out | Retry or check API service status |
| `ERR_SCHEMA_INVALID` | Input doesn't match schema | Validate input against schema |
| `ERR_OLLAMA_MODEL` | Ollama model not available | Pull required model |

---

## Logging

### Enabling Debug Logs
```bash
# Set N8N log level
export N8N_LOG_LEVEL=debug
docker-compose up -d n8n
```

### Log Locations
| Service | Log Access |
|---------|------------|
| N8N | `docker-compose logs n8n` |
| PostgreSQL | `docker-compose logs postgres` |
| Ollama | `docker-compose logs ollama` |

---

## TODO (Iteration 12)

- [ ] Detailed error code documentation
- [ ] Performance troubleshooting
- [ ] Memory optimization guide
- [ ] Rate limit handling strategies
- [ ] Backup recovery procedures

---

## Getting Help

- Check [IMPLEMENTATION_FRAMEWORK.md](../IMPLEMENTATION_FRAMEWORK.md) for specifications
- Review [deployment.md](deployment.md) for setup instructions
- Contact: Sean (REdI, Metro North Health)

---

*This document will be expanded in Iteration 12: Documentation & Handoff*

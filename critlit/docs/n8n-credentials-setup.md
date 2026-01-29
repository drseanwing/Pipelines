# n8n Credentials Setup Guide for CritLit SLR Pipeline

This guide provides step-by-step instructions for configuring all required credentials in n8n to run the Systematic Literature Review (SLR) automation pipeline.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Accessing n8n Credentials Manager](#accessing-n8n-credentials-manager)
3. [PostgreSQL Credentials](#1-postgresql-credentials)
4. [PubMed/NCBI API Credentials](#2-pubmedncbi-api-credentials)
5. [Ollama API Credentials](#3-ollama-api-credentials)
6. [Anthropic API Credentials](#4-anthropic-api-credentials-optional)
7. [OpenAI API Credentials](#5-openai-api-credentials-optional)
8. [Verification and Testing](#verification-and-testing)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before configuring credentials in n8n, ensure:

- [ ] Docker Compose stack is running (`docker-compose up -d`)
- [ ] n8n is accessible at http://localhost:5678
- [ ] You have created a `.env` file from `.env.example` with all required values
- [ ] You have logged into n8n using credentials from `N8N_USER` and `N8N_PASSWORD`

---

## Accessing n8n Credentials Manager

1. Open your browser and navigate to **http://localhost:5678**
2. Log in with your n8n credentials (from `.env` file)
3. Click on your profile icon in the bottom-left corner
4. Select **"Settings"** from the menu
5. Navigate to **"Credentials"** in the left sidebar
6. Click **"+ Add Credential"** to create a new credential

> **Screenshot Placeholder:** n8n credentials manager interface

---

## 1. PostgreSQL Credentials

The PostgreSQL database stores all SLR data including references, screening decisions, extractions, and PRISMA flow data.

### Configuration Steps

1. In the Credentials Manager, click **"+ Add Credential"**
2. Search for and select **"Postgres"** from the list
3. Fill in the following fields:

| Field | Value | Notes |
|-------|-------|-------|
| **Credential name** | `PostgreSQL account` | Descriptive name for identification |
| **Host** | `postgres` | Docker Compose service name |
| **Database** | `slr_database` | Database name (defined in docker-compose.yml) |
| **User** | `slr_user` | Database user (defined in docker-compose.yml) |
| **Password** | `[from .env]` | Use the value from `POSTGRES_PASSWORD` in your `.env` file |
| **Port** | `5432` | Default PostgreSQL port |
| **SSL Mode** | `disable` | SSL not required for local Docker network |

4. Click **"Create"** to save the credential
5. **Test the connection** by creating a simple Postgres node in a test workflow

> **Screenshot Placeholder:** PostgreSQL credential configuration form

### Connection String Format (Reference)

For nodes that require a connection string instead of individual fields:
```
postgresql://slr_user:[POSTGRES_PASSWORD]@postgres:5432/slr_database
```

### Common Issues

- **Connection refused**: Ensure the `postgres` service is running (`docker ps | grep postgres`)
- **Authentication failed**: Verify the password matches `POSTGRES_PASSWORD` in `.env`
- **Database does not exist**: Check that migrations have been applied successfully

---

## 2. PubMed/NCBI API Credentials

The PubMed API allows automated searching of biomedical literature from the NCBI database.

### Why You Need This

- **Without API Key**: 3 requests per second rate limit
- **With API Key**: 10 requests per second rate limit (required for large-scale SLRs)

### Obtaining an API Key

1. Visit https://www.ncbi.nlm.nih.gov/account/
2. Register for an NCBI account (or log in if you already have one)
3. Navigate to **Settings → API Key Management**
4. Click **"Create an API Key"**
5. Copy the generated key and add it to your `.env` file as `PUBMED_API_KEY`

### Configuration Steps in n8n

**Option 1: HTTP Header Authentication (Recommended)**

1. In Credentials Manager, click **"+ Add Credential"**
2. Select **"Header Auth"**
3. Fill in the following:

| Field | Value |
|-------|-------|
| **Credential name** | `PubMed API` |
| **Header Name** | `api_key` |
| **Header Value** | `[from .env PUBMED_API_KEY]` |

**Option 2: Generic Credentials (Alternative)**

1. Create a **"Generic Credential"** credential
2. Add two key-value pairs:

| Key | Value |
|-----|-------|
| `api_key` | `[from .env PUBMED_API_KEY]` |
| `email` | `[from .env CONTACT_EMAIL]` |

### Usage in Workflows

When using the HTTP Request node to query PubMed:

- **Base URL**: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`
- **Query Parameter**: Add `&api_key={{$credentials.api_key}}` to the URL
- **Required Parameters**:
  - `tool`: Your application name (e.g., `critlit`)
  - `email`: Your contact email (from `CONTACT_EMAIL`)

### API Rate Limits

| Scenario | Rate Limit | Notes |
|----------|------------|-------|
| Without API key | 3 requests/second | Not recommended for production |
| With API key | 10 requests/second | Required for bulk operations |
| Burst limits | Up to 100 requests | May trigger temporary blocks if exceeded |

> **Screenshot Placeholder:** Header Auth credential configuration for PubMed

---

## 3. Ollama API Credentials

Ollama provides local LLM inference for AI-assisted screening, data extraction, and quality assessment.

### Why No Authentication?

Ollama runs as a local Docker service within the same network, so no API key or authentication is required. However, you still need to configure the base URL for n8n to communicate with it.

### Configuration Steps

**Option 1: HTTP Request Node (No Credential Required)**

In your n8n workflows using Ollama:

1. Add an **HTTP Request** node
2. Set **Method**: `POST`
3. Set **URL**: `http://ollama:11434/api/generate` (or appropriate Ollama endpoint)
4. Set **Headers**:
   - `Content-Type`: `application/json`
5. Set **Body**: JSON payload with model and prompt

**Option 2: Generic Credential (For Consistency)**

If you prefer to centralize configuration:

1. Create a **"Generic Credential"**
2. Name it `Ollama account`
3. Add the following key-value pair:

| Key | Value |
|-----|-------|
| `base_url` | `http://ollama:11434` |

### Available Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/generate` | Generate completions from a prompt |
| `/api/embeddings` | Generate embeddings for text |
| `/api/tags` | List available models |
| `/api/show` | Get model information |

### Verifying Ollama is Running

```bash
# Check if Ollama container is running
docker ps | grep ollama

# Test the API directly
curl http://localhost:11434/api/tags
```

> **Screenshot Placeholder:** HTTP Request node configured for Ollama

---

## 4. Anthropic API Credentials (Optional)

Anthropic's Claude models provide advanced AI capabilities for screening, extraction, and quality assessment tasks.

### When to Use This

- **High-accuracy screening** requiring nuanced understanding
- **Complex data extraction** from full-text articles
- **Quality assessment** with detailed reasoning
- **Comparison with local models** (A/B testing)

### Obtaining an API Key

1. Visit https://console.anthropic.com/
2. Create an account or log in
3. Navigate to **API Keys** section
4. Click **"Create Key"**
5. Copy the key and add it to your `.env` file as `ANTHROPIC_API_KEY`

### Configuration Steps in n8n

1. In Credentials Manager, click **"+ Add Credential"**
2. Search for and select **"Anthropic"** (if available) or use **"HTTP Header Auth"**

**If using Anthropic credential:**

| Field | Value |
|-------|-------|
| **Credential name** | `Anthropic account` |
| **API Key** | `[from .env ANTHROPIC_API_KEY]` |

**If using Header Auth:**

| Field | Value |
|-------|-------|
| **Credential name** | `Anthropic account` |
| **Header Name** | `x-api-key` |
| **Header Value** | `[from .env ANTHROPIC_API_KEY]` |

### Usage in Workflows

When using HTTP Request node with Anthropic API:

- **Base URL**: `https://api.anthropic.com/v1/messages`
- **Method**: `POST`
- **Headers**:
  - `x-api-key`: Your API key
  - `anthropic-version`: `2023-06-01`
  - `content-type`: `application/json`

### Cost Considerations

| Model | Input Tokens | Output Tokens |
|-------|--------------|---------------|
| Claude 3.5 Sonnet | $3 / 1M tokens | $15 / 1M tokens |
| Claude 3 Haiku | $0.25 / 1M tokens | $1.25 / 1M tokens |

> **Screenshot Placeholder:** Anthropic API credential configuration

---

## 5. OpenAI API Credentials (Optional)

OpenAI provides alternative LLM capabilities for comparison or when specific models are preferred.

### Obtaining an API Key

1. Visit https://platform.openai.com/
2. Create an account or log in
3. Navigate to **API Keys**
4. Click **"Create new secret key"**
5. Copy the key immediately (it won't be shown again)
6. Add it to your `.env` file as `OPENAI_API_KEY`

### Configuration Steps in n8n

1. In Credentials Manager, click **"+ Add Credential"**
2. Search for and select **"OpenAI"**

| Field | Value |
|-------|-------|
| **Credential name** | `OpenAI account` |
| **API Key** | `[from .env OPENAI_API_KEY]` |
| **Organization ID** | (Optional) Leave blank unless using organizational billing |

### Usage Comparison

| Use Case | Recommended Model |
|----------|-------------------|
| Fast screening | GPT-4o-mini |
| Detailed extraction | GPT-4o |
| Embeddings | text-embedding-3-large |

> **Screenshot Placeholder:** OpenAI credential configuration

---

## Verification and Testing

After configuring all credentials, verify they work correctly:

### 1. Test PostgreSQL Connection

Create a simple test workflow:

1. Add a **Postgres** node
2. Select **"Execute Query"** operation
3. Use the `PostgreSQL account` credential
4. Enter query: `SELECT version();`
5. Click **"Execute Node"**
6. Verify you see PostgreSQL version information

### 2. Test PubMed API

Create an HTTP Request test:

1. Add **HTTP Request** node
2. Use **GET** method
3. URL: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=systematic+review&retmode=json&api_key={{$credentials.api_key}}`
4. Use `PubMed API` credential
5. Execute and verify JSON response with search results

### 3. Test Ollama

1. Add **HTTP Request** node
2. Method: **POST**
3. URL: `http://ollama:11434/api/tags`
4. Execute and verify list of available models

### 4. Test Anthropic (if configured)

1. Add **HTTP Request** node
2. Method: **POST**
3. URL: `https://api.anthropic.com/v1/messages`
4. Headers:
   - `x-api-key`: Use Anthropic credential
   - `anthropic-version`: `2023-06-01`
   - `content-type`: `application/json`
5. Body:
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 100,
  "messages": [
    {"role": "user", "content": "Say hello!"}
  ]
}
```
6. Execute and verify response

---

## Troubleshooting

### PostgreSQL Connection Issues

| Error | Solution |
|-------|----------|
| `Connection refused` | Check `docker ps` - ensure postgres container is running |
| `Authentication failed` | Verify password matches `.env` file exactly |
| `Database does not exist` | Run database migrations: `docker-compose exec postgres psql -U slr_user -d slr_database -f /docker-entrypoint-initdb.d/schema.sql` |
| `Timeout` | Increase connection timeout in credential settings |

### PubMed API Issues

| Error | Solution |
|-------|----------|
| `429 Too Many Requests` | You've exceeded rate limits - add delays between requests |
| `403 Forbidden` | Check API key is valid and properly formatted |
| `Invalid query` | Verify search syntax follows PubMed E-utilities format |

### Ollama Issues

| Error | Solution |
|-------|----------|
| `Connection refused` | Ensure Ollama container is running and healthy |
| `Model not found` | Pull the required model: `docker exec -it critlit-ollama-1 ollama pull llama3.2` |
| `Out of memory` | Increase Docker memory allocation or use smaller models |

### Anthropic/OpenAI API Issues

| Error | Solution |
|-------|----------|
| `Invalid API key` | Regenerate key from console and update `.env` |
| `Rate limit exceeded` | Implement exponential backoff in workflows |
| `Insufficient quota` | Check billing and add credits to account |

---

## Security Best Practices

1. **Never commit credentials**: Ensure `.env` is in `.gitignore`
2. **Rotate API keys regularly**: Especially for production environments
3. **Use credential encryption**: n8n encrypts credentials using `N8N_ENCRYPTION_KEY` - never change this key after initial setup
4. **Limit credential access**: Use n8n's role-based access control (RBAC) in production
5. **Monitor API usage**: Set up billing alerts for external APIs
6. **Audit credential usage**: Review n8n's execution logs regularly

---

## Next Steps

After configuring credentials:

1. Review the [SLR Pipeline Overview](./slr-pipeline-overview.md) (if available)
2. Import the provided n8n workflows from `n8n/workflows/`
3. Test each workflow with sample data
4. Configure workflow schedules and triggers
5. Set up monitoring and alerting

---

## Additional Resources

- [n8n Credentials Documentation](https://docs.n8n.io/credentials/)
- [PubMed E-utilities API Documentation](https://www.ncbi.nlm.nih.gov/books/NBK25501/)
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference/)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-25
**Maintained By**: CritLit Development Team

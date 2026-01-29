# REdI | CritLit Quickstart Guide

Get your automated systematic literature review (SLR) pipeline running in under 10 minutes.

---

## Prerequisites

Before you begin, ensure you have:

### Required Software
- **Docker Desktop** (v20.10+) - [Download here](https://www.docker.com/products/docker-desktop)
- **Git** - [Download here](https://git-scm.com/downloads)
- **16GB RAM minimum** (32GB recommended for large reviews)
- **50GB free disk space**

### Recommended Hardware
- **NVIDIA GPU** with CUDA support (optional, for faster local LLM inference)
- **GPU-enabled Docker** (Windows/Mac: Docker Desktop with GPU support, Linux: NVIDIA Container Toolkit)

### API Keys (Get These First)

| Service | Required? | Purpose | Get It Here |
|---------|-----------|---------|-------------|
| **PubMed/NCBI** | ✅ Yes | Search biomedical literature (10 req/sec vs 3 req/sec) | [Register](https://www.ncbi.nlm.nih.gov/account/) |
| **Anthropic Claude** | ⚪ Optional | AI-powered screening & extraction | [Get API Key](https://console.anthropic.com/) |
| **OpenAI** | ⚪ Optional | Alternative LLM provider | [Get API Key](https://platform.openai.com/) |
| **Primo** | ⚪ Optional | Institutional full-text access | Contact your library |

---

## Step 1: Clone and Configure

### Clone the Repository

```bash
# Clone the repository
git clone https://github.com/drseanwing/CritLit.git
cd CritLit
```

### Configure Environment Variables

```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your credentials
# Windows: notepad .env
# Mac/Linux: nano .env
```

**Required Configuration Values:**

```bash
# Database Security
POSTGRES_PASSWORD=your_strong_password_here    # Use 16+ characters

# n8n Access
N8N_USER=admin                                 # Your username
N8N_PASSWORD=your_n8n_password                 # Strong password

# n8n Encryption (CRITICAL - Generate this key!)
N8N_ENCRYPTION_KEY=your_encryption_key         # Generate with: openssl rand -base64 32

# PubMed API
PUBMED_API_KEY=your_ncbi_api_key               # From NCBI account
CONTACT_EMAIL=researcher@example.com           # Your email for API compliance

# Optional AI Services
ANTHROPIC_API_KEY=your_claude_api_key          # Optional but recommended
OPENAI_API_KEY=your_openai_key                 # Optional
```

**Generate Encryption Key:**

```bash
# Mac/Linux/WSL
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Important:** Never change `N8N_ENCRYPTION_KEY` after initial setup or you'll lose access to stored credentials.

---

## Step 2: Start Services

### Using the Startup Script (Recommended)

**Linux/Mac/WSL:**
```bash
bash scripts/startup.sh
```

**Windows (PowerShell):**
```powershell
# Manual startup - see below
```

### Manual Startup (All Platforms)

```bash
# Start all services in detached mode
docker compose up -d

# Wait 60 seconds for services to initialize
# (PostgreSQL takes time to initialize the database)

# View logs to monitor startup
docker compose logs -f
```

**Expected Output:**
```
✓ PostgreSQL is healthy
✓ Redis is responding
✓ n8n is responding
✓ Ollama is responding
✓ i-Librarian is responding
✓ n8n worker is running
```

---

## Step 3: Verify Installation

### Quick Health Check

```bash
# Check all services are running
docker compose ps

# Expected: All services show "Up" or "Up (healthy)"
```

### Run Verification Scripts (Linux/Mac/WSL)

```bash
# Verify PostgreSQL database and schema
bash scripts/verify-postgres.sh

# Verify Ollama LLM service (and GPU if available)
bash scripts/verify-ollama.sh

# Verify vector search capabilities
bash scripts/verify-vector.sh
```

### Manual Verification (All Platforms)

**PostgreSQL:**
```bash
docker exec -it slr_postgres psql -U slr_user -d slr_database -c "SELECT version();"
```

**n8n:**
```bash
# Open in browser - should show login page
http://localhost:7361
```

**Ollama:**
```bash
# Test API endpoint
curl http://localhost:7362/api/tags
```

---

## Step 4: Access n8n Workflow Platform

### Login to n8n

1. Open your browser to **http://localhost:7361**
2. Login with credentials from your `.env` file:
   - Username: Value of `N8N_USER`
   - Password: Value of `N8N_PASSWORD`

### Configure Credentials

Before importing workflows, you must configure API credentials in n8n.

**Required Credentials:**

1. **PostgreSQL** - For database access
2. **PubMed API** - For literature searches
3. **Ollama** - For local LLM inference (no auth required)
4. **Anthropic** (optional) - For Claude AI
5. **OpenAI** (optional) - For GPT models

**Detailed Setup Instructions:**
See [n8n Credentials Setup Guide](./n8n-credentials-setup.md) for step-by-step configuration.

### Quick Credential Setup

1. Click your profile icon (bottom-left) → **Settings** → **Credentials**
2. Click **"+ Add Credential"**
3. For each service, add the required information:

**PostgreSQL:**
```
Host: postgres
Database: slr_database
User: slr_user
Password: [from .env POSTGRES_PASSWORD]
Port: 5432
SSL Mode: disable
```

**PubMed API (Header Auth):**
```
Header Name: api_key
Header Value: [from .env PUBMED_API_KEY]
```

**Anthropic (if using):**
```
API Key: [from .env ANTHROPIC_API_KEY]
```

---

## Step 5: Import Workflows

### Available Workflows

The `workflows/` directory contains pre-built n8n workflows:

| Workflow | Purpose | Required Credentials |
|----------|---------|---------------------|
| `slr_protocol_setup.json` | Initialize a new SLR project | PostgreSQL |
| `slr_search_execution.json` | Execute PubMed searches | PostgreSQL, PubMed API |
| `slr_screening_batch.json` | AI-assisted title/abstract screening | PostgreSQL, Ollama/Anthropic |
| `slr_screen_single.json` | Review individual documents | PostgreSQL |
| `slr_main_coordinator.json` | Orchestrate entire SLR pipeline | All credentials |
| `test_pubmed_search.json` | Test PubMed API connection | PubMed API |
| `slr_prisma_generation.json` | Generate PRISMA flow diagram | PostgreSQL |
| `slr_human_review.json` | Human review interface | PostgreSQL |
| `slr_resume.json` | Resume interrupted workflows | PostgreSQL |
| `slr_error_handler.json` | Handle and log errors | PostgreSQL |

### Import Workflows into n8n

1. In n8n, click **Workflows** (left sidebar)
2. Click **Import from File**
3. Navigate to `CritLit/workflows/`
4. Select a workflow JSON file
5. Click **Import**
6. Repeat for each workflow you want to use

**Recommendation:** Start with these workflows in order:
1. `test_pubmed_search.json` - Verify PubMed API
2. `slr_protocol_setup.json` - Create your first review
3. `slr_search_execution.json` - Run your first search

---

## Step 6: Create Your First Review

### Initialize a New SLR Project

1. Open the **slr_protocol_setup** workflow
2. Click the **"Execute Workflow"** button (play icon)
3. Provide the following information:
   - **Review Title**: e.g., "AI in Medical Diagnosis: A Systematic Review"
   - **Research Question**: Your PICO/SPIDER question
   - **Inclusion Criteria**: List of inclusion criteria
   - **Exclusion Criteria**: List of exclusion criteria
4. Click **"Execute Node"**
5. Note the **Review ID** returned - you'll use this for subsequent steps

**Example:**
```json
{
  "title": "Machine Learning in Cancer Detection: Systematic Review",
  "research_question": "What is the effectiveness of machine learning models for early cancer detection in medical imaging?",
  "inclusion_criteria": [
    "Published 2018-2024",
    "Peer-reviewed journals",
    "Machine learning for cancer detection",
    "Medical imaging modality",
    "Sensitivity/specificity reported"
  ],
  "exclusion_criteria": [
    "Conference abstracts",
    "Non-English publications",
    "Reviews or meta-analyses",
    "Animal studies"
  ]
}
```

---

## Step 7: Run Your First Search

### Execute a PubMed Search

1. Open the **slr_search_execution** workflow
2. In the workflow settings, update the **Search Configuration** node:
   - **Review ID**: The ID from Step 6
   - **Search Query**: Your PubMed search string (use Boolean operators)
   - **Max Results**: Start with 100 for testing (then increase)
3. Click **"Execute Workflow"**
4. Monitor the execution progress in the workflow canvas

**Example Search Query:**
```
("machine learning"[MeSH Terms] OR "deep learning"[All Fields])
AND ("cancer detection"[MeSH Terms] OR "tumor detection"[All Fields])
AND ("2018/01/01"[Date - Publication] : "2024/12/31"[Date - Publication])
```

**What Happens:**
- Search executes against PubMed E-utilities API
- Results are fetched with full metadata (title, authors, abstract, DOI)
- Records are stored in `documents` table
- Duplicates are detected using vector embeddings
- Search execution is logged in `search_executions` table

---

## Step 8: Review and Screen Results

### View Search Results

**Option 1: Query Database Directly**

```bash
docker exec -it slr_postgres psql -U slr_user -d slr_database
```

```sql
-- See your review
SELECT * FROM reviews ORDER BY created_at DESC LIMIT 1;

-- See search executions
SELECT id, review_id, database, query_string, results_count, created_at
FROM search_executions
WHERE review_id = 1;

-- See retrieved documents
SELECT id, title, authors, journal, publication_year, abstract
FROM documents
WHERE review_id = 1
LIMIT 10;

-- Exit psql
\q
```

**Option 2: Use n8n Workflow**

1. Open **slr_screening_batch** workflow
2. Set the **Review ID** parameter
3. Configure screening criteria (AI model, screening stage)
4. Execute the workflow
5. Review screening decisions in the `screening_decisions` table

### Manual Screening Interface

1. Open **slr_human_review** workflow
2. Configure for your Review ID
3. Execute to launch a simple web-based review interface (via webhook)
4. Access at: `http://localhost:7361/webhook/review/{review_id}`

---

## Step 9: Generate PRISMA Flow Diagram

After completing screening:

1. Open **slr_prisma_generation** workflow
2. Set your **Review ID**
3. Execute the workflow
4. PRISMA flow data is stored in `prisma_flow` table
5. Export diagram data for visualization

**PRISMA Flow Stages Tracked:**
- Identification: Records identified from database searches
- Screening: Records after duplicates removed
- Eligibility: Full-text articles assessed
- Included: Studies included in synthesis

---

## Next Steps

### For Production Use

1. **Scale Up Searches**: Increase `max_results` in search workflows
2. **Enable Background Workers**: Scale n8n workers for parallel processing
3. **Configure AI Screening**: Fine-tune prompts and confidence thresholds
4. **Set Up Monitoring**: Track execution logs and errors
5. **Implement Backups**: Regular database backups (see [README.md](../README.md))

### Advanced Features

- **Full-Text PDF Management**: Use i-Librarian at http://localhost:7363
- **Quality Assessment**: Configure GRADE/CASP/JBI checklists
- **Data Extraction**: Customize extraction templates
- **Meta-Analysis Integration**: Export data for RevMan/R

### Documentation

- [README.md](../README.md) - Complete system documentation
- [n8n-credentials-setup.md](./n8n-credentials-setup.md) - Detailed credential configuration
- [checkpoint-schema.md](./checkpoint-schema.md) - Database schema reference
- [LIMITATIONS.md](./LIMITATIONS.md) - Current system limitations

---

## Troubleshooting

### Services Won't Start

**Problem:** `docker compose up -d` fails

**Solution:**
```bash
# Check Docker is running
docker info

# View error logs
docker compose logs postgres
docker compose logs n8n

# Restart services
docker compose restart
```

### Can't Connect to n8n

**Problem:** http://localhost:7361 shows "Connection refused"

**Solution:**
```bash
# Check n8n is running
docker compose ps n8n

# View n8n logs
docker compose logs n8n

# Wait for initialization (can take 60 seconds)
# If still failing after 2 minutes, restart:
docker compose restart n8n
```

### n8n Encryption Key Mismatch

**Problem:** n8n container keeps restarting with error:
```
Error: Mismatching encryption keys. The encryption key in the settings file
/home/node/.n8n/config does not match the N8N_ENCRYPTION_KEY env var.
```

**Why This Happens:**
When n8n starts for the first time, it stores the encryption key in its config file (inside the Docker volume). If you later change `N8N_ENCRYPTION_KEY` in your `.env` file—or start with a new `.env` but an existing n8n volume—the keys won't match.

**Solution 1: Use the Original Encryption Key (Recommended if you have stored credentials)**

If you still have access to the original encryption key, update your `.env` file to use it:
```bash
# Check the encryption key stored in n8n's config
docker run --rm -v critlit_n8n_data:/data alpine cat /data/config 2>/dev/null | grep -o '"encryptionKey":"[^"]*"' | cut -d'"' -f4

# Update N8N_ENCRYPTION_KEY in .env to match the key from the config file
nano .env

# Restart n8n
docker compose restart n8n
```

**Solution 2: Reset n8n Data (Use if you don't need existing credentials/workflows)**

If you don't need to preserve stored credentials and workflows in n8n:
```bash
# Stop all services
docker compose down

# Remove the n8n data volume (WARNING: This deletes all n8n workflows and credentials)
docker volume rm critlit_n8n_data

# Start services again - n8n will use the key from .env
docker compose up -d
```

**Solution 3: Use the Helper Script**

A helper script is provided to diagnose and resolve this issue:
```bash
# Run the troubleshooting script
bash scripts/fix-n8n-encryption.sh
```

**Prevention:**
- **Never change** `N8N_ENCRYPTION_KEY` after initial setup
- **Back up** your encryption key securely (e.g., password manager)
- If using version control for `.env` files, store the encryption key separately

### PostgreSQL Connection Failed

**Problem:** n8n workflows can't connect to database

**Solution:**
```bash
# Verify PostgreSQL is healthy
docker compose ps postgres

# Wait for health check to pass
docker compose logs postgres | grep "ready to accept connections"

# Test connection manually
docker exec -it slr_postgres psql -U slr_user -d slr_database -c "SELECT 1;"

# If password error: Double-check POSTGRES_PASSWORD in .env matches credential in n8n
```

### Ollama Not Working

**Problem:** Ollama API timeouts or "model not found"

**Solution:**
```bash
# Check Ollama is running
docker compose ps ollama

# Pull a model (llama3.2 recommended for screening)
docker compose exec ollama ollama pull llama3.2

# For faster inference (GPU required):
docker compose exec ollama ollama pull llama3.2:70b

# List installed models
docker compose exec ollama ollama list

# Test generation
curl http://localhost:7362/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Hello!",
  "stream": false
}'
```

### PubMed Rate Limiting

**Problem:** "429 Too Many Requests" errors

**Solution:**
- Verify `PUBMED_API_KEY` is correctly configured in n8n credentials
- Add a **Wait** node (2-3 seconds) between PubMed requests in workflows
- Check NCBI account is in good standing at https://www.ncbi.nlm.nih.gov/account/

### Out of Disk Space

**Problem:** Docker consumes too much disk

**Solution:**
```bash
# Check Docker disk usage
docker system df

# Clean up unused containers/images
docker system prune -a

# Remove specific volumes (WARNING: destroys data)
docker volume rm critlit_postgres_data
docker volume rm critlit_n8n_data
```

### n8n Workflow Import Fails

**Problem:** "Invalid workflow JSON" error

**Solution:**
- Ensure you're importing `.json` files from `workflows/` directory
- Check JSON syntax: `cat workflows/slr_protocol_setup.json | jq .`
- Re-download workflows from GitHub if corrupted

---

## Common Commands Reference

### Service Management

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart a specific service
docker compose restart postgres
docker compose restart n8n

# View logs
docker compose logs -f              # All services
docker compose logs -f postgres     # Specific service
docker compose logs --tail=100 n8n  # Last 100 lines
```

### Database Operations

```bash
# Connect to PostgreSQL
docker exec -it slr_postgres psql -U slr_user -d slr_database

# Backup database
docker exec slr_postgres pg_dump -U slr_user slr_database > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_20260125.sql | docker exec -i slr_postgres psql -U slr_user -d slr_database
```

### Ollama Model Management

```bash
# List installed models
docker compose exec ollama ollama list

# Pull a new model
docker compose exec ollama ollama pull llama3.2

# Remove a model
docker compose exec ollama ollama rm llama3.2:70b

# Check GPU status
docker compose exec ollama nvidia-smi
```

---

## Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/drseanwing/CritLit/issues)
- **Documentation**: Check `/docs` directory for detailed guides
- **Logs**: Always check `docker compose logs <service>` for error details
- **Community**: [Link to community forum/Discord if available]

---

## What's Next?

Now that your REdI | CritLit pipeline is running:

1. **Customize Workflows**: Edit workflows to match your review protocol
2. **Configure AI Prompts**: Fine-tune screening and extraction prompts
3. **Set Up Automation**: Schedule searches to run periodically
4. **Integrate Tools**: Connect to Zotero, Mendeley, or EndNote
5. **Scale Infrastructure**: Increase Docker resources for large reviews

**Happy reviewing!** 🚀

---

**Document Version**: 1.1
**Last Updated**: 2026-01-29
**Maintained By**: REdI | CritLit Project Team

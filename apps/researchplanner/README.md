# QI Research Pipeline

A comprehensive automation pipeline for Quality Improvement (QI) and research project development in healthcare settings. This system guides projects from initial concept through ethics approval and document generation using AI-powered assistance.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Development Setup](#development-setup)
- [Deployment](#deployment)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

## Overview

The QI Research Pipeline automates the complex process of developing healthcare research and quality improvement projects. It uses Claude AI to assist with:

- **Project Classification**: Automatically determines if a project is QI, Research, or Hybrid
- **Literature Review**: Searches and synthesizes relevant academic literature
- **Methodology Design**: Generates appropriate study designs and analysis plans
- **Ethics Assessment**: Evaluates ethics requirements and generates governance documentation
- **Document Generation**: Creates submission-ready documents (protocols, applications, consent forms)

### Pipeline Stages

```
INTAKE -> CLASSIFICATION -> RESEARCH -> METHODOLOGY -> ETHICS -> DOCUMENTS -> SUBMISSION
   |          |                |            |            |           |            |
   v          v                v            v            v           v            v
Project   QI/Research     Literature    Study       Ethics      Protocol      Final
Details   Determination    Review       Design     Assessment   Generation   Package
```

## Features

- **AI-Powered Assistance**: Uses Claude API for intelligent content generation
- **n8n Workflow Integration**: Orchestrates complex multi-step processes
- **JSONB Flexible Schema**: Adapts to varying project requirements
- **Comprehensive Audit Trail**: Full logging of all project changes
- **Document Templates**: Pre-built templates for common healthcare documents
- **Role-Based Access Control**: Supports PI, Co-Investigator, and Admin roles
- **RESTful API**: Easy integration with existing systems

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 15.x or higher
- Docker and Docker Compose (recommended)
- Anthropic API key (for Claude)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ResearchPlanner
   ```

2. **Run the development setup script**
   ```bash
   chmod +x scripts/setup-dev.sh
   ./scripts/setup-dev.sh
   ```

3. **Configure environment variables**
   ```bash
   # Edit .env with your API keys
   nano .env
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   ```
   http://localhost:7401
   ```

### Quick Start with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure the following:

```bash
# Application
NODE_ENV=development
PORT=7401

# Database Configuration
# Use localhost:7402 when running app locally with PostgreSQL in Docker
# Use postgres:5432 when running app inside Docker (docker-compose)
DB_HOST=localhost
DB_PORT=7402
DB_NAME=qi_research_pipeline
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
ANTHROPIC_MAX_TOKENS=4096

# n8n Workflow Engine
N8N_HOST=http://localhost:7400
N8N_API_KEY=your_n8n_api_key

# Email Notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password

# Security
SESSION_SECRET=your_32_char_secret
JWT_SECRET=your_32_char_jwt_secret
```

### n8n Credentials

Import credential templates from `config/n8n-credentials.json`:

1. Open n8n (default: http://localhost:7400)
2. Navigate to Settings > Credentials
3. Click "Import from File"
4. Select `config/n8n-credentials.json`
5. Update placeholder values with actual credentials

### Database Configuration

The application uses PostgreSQL with JSONB columns for flexible data storage:

| Table | Purpose |
|-------|---------|
| `users` | User accounts and authentication |
| `projects` | Core project data with stage-specific JSONB columns |
| `documents` | Generated document metadata |
| `references` | Literature references from research stage |
| `audit_log` | Comprehensive audit trail |
| `project_team_members` | Project team assignments |

## Development Setup

### Manual Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start PostgreSQL (if not using Docker)
# ... start your PostgreSQL instance ...

# Run migrations
npm run db:migrate

# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run linting
npm run lint
```

### Using the Setup Script

```bash
# Full setup with database
./scripts/setup-dev.sh

# Reset environment
./scripts/setup-dev.sh --reset

# Skip database setup
./scripts/setup-dev.sh --skip-db
```

### Available npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm test` | Run test suite |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run database migrations |

## Continuous Integration

The project uses GitHub Actions for continuous integration and automated testing.

### CI Workflow

The CI pipeline runs automatically on:
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop` branches

### CI Jobs

| Job | Description | Status on Failure |
|-----|-------------|-------------------|
| **Test** | Runs the full test suite with Vitest | ❌ Fails the build |
| **Lint** | Checks code quality with ESLint | ⚠️ Continues with warning |
| **Build** | Compiles TypeScript code | ⚠️ Continues with warning |

### Test Coverage

Test coverage reports are automatically generated and can be uploaded to Codecov. To enable:

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. Add the `CODECOV_TOKEN` secret to your GitHub repository settings
4. Coverage reports will be automatically uploaded on each CI run

### Local CI Testing

Before pushing, you can run the same checks locally:

```bash
# Run tests
npm test

# Run linter
npm run lint

# Build project
npm run build
```

## Deployment

### Port Mappings

#### Production Deployment

The application uses the following port mappings in production:

| Service | External Port | Internal Port | Description |
|---------|--------------|---------------|-------------|
| **n8n** | 7400 | 5678 | n8n workflow orchestration UI and webhooks |
| **Application** | 7401 | 3000 | Main application REST API |

**Note:** PostgreSQL is not exposed externally in production for security. Services communicate using internal Docker networking.

#### Development Deployment

Additional ports are exposed in development mode (using `docker-compose.dev.yml`):

| Service | External Port | Internal Port | Description |
|---------|--------------|---------------|-------------|
| **PostgreSQL** | 7402 | 5432 | PostgreSQL database (for local tools like pgAdmin) |
| **Redis** | 7403 | 6379 | Redis cache (for Redis CLI/Commander) |
| **Adminer** | 7404 | 8080 | Database management UI |
| **Redis Commander** | 7405 | 8081 | Redis web UI |
| **MailHog SMTP** | 7406 | 1025 | SMTP server for email testing |
| **MailHog Web UI** | 7407 | 8025 | Email testing web interface |
| **Node.js Debugger** | 7408 | 9229 | Node.js debugging port |

### Production Deployment

```bash
# Make scripts executable
chmod +x scripts/deploy.sh
chmod +x scripts/migrate.sh

# Run deployment
./scripts/deploy.sh
```

### Deployment Options

```bash
# Skip migrations (if already applied)
./scripts/deploy.sh --skip-migrations

# Skip build (if using pre-built artifacts)
./scripts/deploy.sh --no-build
```

### Database Migrations

```bash
# Run all pending migrations
./scripts/migrate.sh

# Show migration status
./scripts/migrate.sh --status

# Dry run (preview without executing)
./scripts/migrate.sh --dry-run

# Rollback to specific version
./scripts/migrate.sh --rollback 001
```

### Docker Deployment

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose logs -f app

# Scale workers
docker-compose up -d --scale worker=3
```

### Docker Compose Deployment

The recommended approach for production deployment uses Docker Compose to orchestrate all required services.

#### 1. Prepare Environment

Create a `.env` file with production values (see Configuration section above).

#### 2. Start Services

```bash
docker-compose up -d
```

This starts:
- **n8n**: Workflow orchestration at http://localhost:7400
- **PostgreSQL**: Database (internal network only)
- **Redis** (optional): Caching and job queue

**Note:** In production mode, PostgreSQL is not exposed externally. Use `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d` to enable development ports.

#### 3. Verify Deployment

Check service health:

```bash
docker-compose ps
```

Access n8n at configured `WEBHOOK_URL` or http://localhost:7400 for development.

#### 4. Import Workflows

Import the workflow definitions into n8n:

1. Access n8n UI
2. Navigate to Workflows
3. Import JSON files from `src/workflows/` directory
4. Configure n8n database connections to match `.env` settings
5. Activate workflows

#### 5. Database Initialization

Run migrations to set up schema:

```bash
docker-compose exec n8n npm run migrate
```

### Manual Deployment

For bare-metal or Kubernetes deployments:

1. Install Node.js 18+ and PostgreSQL 13+
2. Clone repository and run `npm install`
3. Create PostgreSQL database and user
4. Configure `.env` with connection details
5. Run `npm run build` and `npm run migrate`
6. Run `npm start` (use process manager like PM2 in production)
7. Deploy n8n using Docker or npm package
8. Configure n8n to use your PostgreSQL instance
9. Import workflow JSON files

For Kubernetes deployment, create ConfigMaps for `.env` and mount workflow volumes appropriately.

### Health Checks

Verify deployment:

```bash
# Check n8n is responding
curl https://your-domain.com/webhook/research-planner

# Check database connection
npm run db:health

# Run integration tests
npm run test:integration
```

### Security Hardening

For production deployments:

1. **Enable HTTPS** - Set `N8N_PROTOCOL=https` and configure TLS certificates
2. **Restrict CORS** - Configure webhook endpoint to accept only trusted origins
3. **Database Encryption** - Enable SSL/TLS for PostgreSQL connections
4. **API Key Rotation** - Implement regular Anthropic API key rotation
5. **Access Control** - Configure n8n users and permissions
6. **Audit Logging** - Enable PostgreSQL and n8n audit logs
7. **Backup Strategy** - Schedule regular database and document backups

## Usage

### Basic Workflow

1. **Create Project** - Submit intake form with project concept
2. **Review Intake** - Approve classification and frameworks
3. **Research Phase** - System searches literature and synthesizes evidence
4. **Review Research** - Approve methodology recommendations
5. **Methods Phase** - System develops study design and analysis plan
6. **Review Methods** - Approve detailed procedures and outcomes
7. **Ethics Phase** - System evaluates ethics requirements and governance
8. **Review Ethics** - Approve consent approach and data management plan
9. **Documents Phase** - System generates submission-ready documents
10. **Final Review** - Approve and download complete submission package

### API Endpoints

The pipeline exposes webhook endpoints for integration:

```
POST /webhook/research-planner/intake
  - Submit project intake form

POST /webhook/research-planner/intake-approved
  - Approve intake stage (triggers research phase)

POST /webhook/research-planner/research-approved
  - Approve research stage (triggers methods phase)

POST /webhook/research-planner/methods-approved
  - Approve methods stage (triggers ethics phase)

POST /webhook/research-planner/ethics-approved
  - Approve ethics stage (triggers document generation)
```

For complete API documentation, see [API.md](./docs/API.md).

## Pipeline Stages Explained

### Stage 1: Project Intake
Captures project concept, scope, investigator details, and intended outcomes. The system classifies projects as QI, Research, or Hybrid and determines applicable frameworks and reporting guidelines.

**Key Outputs:**
- Project record with unique identifier
- Classification report with confidence score
- Framework requirements mapping
- Research brief for next stage

### Stage 2: Research & Literature Review
Conducts automated literature search across PubMed, Semantic Scholar, and Cochrane Library. The system synthesizes evidence, identifies knowledge gaps, and formats citations.

**Key Outputs:**
- Documented search strategy
- Literature summary (2-3 pages)
- Gap analysis identifying research needs
- Evidence table with processed articles
- Reference library in Vancouver format

### Stage 3: Methodology Development
Develops study design, participant criteria, sample size calculations, outcome specifications, and analysis plans. Recommends appropriate reporting guidelines (CONSORT, STROBE, PRISMA, etc.).

**Key Outputs:**
- Study design with justification
- Participant specification (inclusion/exclusion criteria)
- Outcome definitions with measurement approaches
- Statistical analysis plan
- Project timeline with milestones

### Stage 4: Ethics & Governance Evaluation
Assesses ethical considerations, determines approval pathways (QI Registration, Low Risk Research, or Full HREC Review), and develops data management plans.

**Key Outputs:**
- Ethics pathway determination
- Risk assessment per National Statement
- Consent requirements specification
- Data governance and management plan
- Compliance checklist for institutional requirements

### Stage 5: Document Generation
Generates all submission-ready documents using institutional templates. Creates research protocols, grant applications, HREC cover letters, participant information sheets, and compliance documentation.

**Key Outputs:**
- Research protocol (DOCX)
- Grant application (DOCX)
- HREC cover letter (DOCX)
- Participant information sheet (DOCX)
- Data management plan (DOCX)
- Complete submission package (ZIP)

## License

This project is provided as-is for use within Metro North Health. For licensing details, contact the development team.

---

**For more information:**
- Full specification: [qi-research-pipeline-spec.md](./qi-research-pipeline-spec.md)
- Implementation tasks: [TASKS.md](./TASKS.md)
- Complete deployment guide: [DEPLOYMENT.md](./docs/DEPLOYMENT.md) (when available)
- API documentation: [API.md](./docs/API.md) (when available)
- Troubleshooting: [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) (when available)

**Last Updated:** 2026-01-28
**Specification Version:** 1.0

## Architecture

### System Architecture

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|   Web Client     |---->|   Express API    |---->|   PostgreSQL     |
|   (Future)       |     |   (Node.js)      |     |   Database       |
|                  |     |                  |     |                  |
+------------------+     +--------+---------+     +------------------+
                                 |
                                 v
                    +------------+------------+
                    |                         |
          +---------+---------+     +---------+---------+
          |                   |     |                   |
          |   Claude API      |     |   n8n Workflows   |
          |   (Anthropic)     |     |   (Automation)    |
          |                   |     |                   |
          +-------------------+     +-------------------+
```

### Directory Structure

```
ResearchPlanner/
├── config/                 # Configuration files
│   └── n8n-credentials.json
├── scripts/               # Deployment and utility scripts
│   ├── deploy.sh
│   ├── migrate.sh
│   └── setup-dev.sh
├── src/
│   ├── agents/            # AI agent implementations
│   ├── db/
│   │   ├── migrations/    # SQL migration files
│   │   └── repositories/  # Database access layer
│   ├── documents/         # Document generation
│   ├── llm/              # LLM integration (Claude)
│   ├── services/         # Business logic services
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── validation/       # Input validation schemas
├── templates/
│   ├── ethics/           # Ethics application templates
│   ├── governance/       # Governance document templates
│   ├── grants/           # Grant application templates
│   └── protocols/        # Research protocol templates
├── tests/                # Test files
├── workflows/            # n8n workflow definitions
├── .env.example          # Environment variable template
├── package.json
├── tsconfig.json
└── README.md
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20.x |
| Language | TypeScript 5.x |
| Web Framework | Express 4.x |
| Database | PostgreSQL 15.x |
| AI/LLM | Anthropic Claude API |
| Workflow Engine | n8n |
| Document Generation | docx.js |
| Validation | Zod |
| Testing | Vitest |

### Data Flow

1. **Intake**: User submits project details via API
2. **Classification**: Claude AI analyzes and classifies project type
3. **Research**: System searches PubMed, Claude synthesizes findings
4. **Methodology**: Claude generates study design based on classification
5. **Ethics**: System determines ethics pathway and requirements
6. **Documents**: Templates populated with project data, generated as DOCX

## API Reference

### Projects

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List all projects |
| `/api/projects` | POST | Create new project |
| `/api/projects/:id` | GET | Get project by ID |
| `/api/projects/:id` | PUT | Update project |
| `/api/projects/:id/status` | PATCH | Update project status |
| `/api/projects/:id/approve` | POST | Approve current stage |

### Documents

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects/:id/documents` | GET | List project documents |
| `/api/projects/:id/documents/generate` | POST | Generate documents |
| `/api/documents/:id/download` | GET | Download document |

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check endpoint |
| `/health/ready` | GET | Readiness check |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use ESLint configuration provided
- Write tests for new features
- Update documentation as needed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on the repository or contact the development team.

---

Built with care for healthcare research excellence.

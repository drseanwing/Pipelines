# FOAM N8N Operations Scripts

Comprehensive operational scripts for the FOAM N8N multi-LLM orchestration system.

## Available Scripts

| Script | Purpose |
|--------|---------|
| `setup.sh` | Initial deployment and configuration |
| `backup.sh` | Comprehensive backup with encryption |
| `restore.sh` | Safe restore with health checks |

See [deployment.md](../docs/deployment.md) for setup instructions.

## Quick Start

### Create a Backup

```bash
# Basic backup (stored in ./backups)
./scripts/backup.sh

# Encrypted backup
./scripts/backup.sh --encrypt

# Custom location with retention
./scripts/backup.sh --output-dir /mnt/backups --retain 14
```

### Restore from Backup

```bash
# Full restore with confirmation
./scripts/restore.sh --backup-file ./backups/foam-n8n-backup-20260125_120000

# Restore without confirmation (useful for automation)
./scripts/restore.sh --backup-file ./backups/foam-n8n-backup-20260125_120000 --no-confirm

# Restore only database
./scripts/restore.sh --backup-file ./backups/foam-n8n-backup-20260125_120000 --component db
```

## Backup Script (`backup.sh`)

### What Gets Backed Up

| Component | Description | File/Format |
|-----------|-------------|-------------|
| **PostgreSQL Database** | Complete database dump (n8n DB + foam schema) | `postgres-dump.sql.gz` |
| **N8N Data Volume** | User data, credentials, workflow executions | `n8n-data.tar.gz` |
| **Workflow Files** | JSON workflow definitions | `workflows.tar.gz` |
| **Environment Config** | .env file with API keys and credentials | `.env` or `.env.gpg` (encrypted) |
| **Config Files** | postgres-init.sql and other config | `config.tar.gz` |
| **Metadata** | Backup info, checksums, timestamps | `metadata.json` |

### Options

```
--output-dir DIR    Backup directory (default: ./backups)
--encrypt           Encrypt sensitive files with GPG passphrase
--retain N          Keep N most recent backups (default: 7)
--quiet             Minimal output for automation
--help              Show help message
```

### Features

1. **Timestamped Backups**: Each backup has unique timestamp `foam-n8n-backup-YYYYMMDD_HHMMSS`

2. **Compression**: All components are compressed with gzip/tar.gz

3. **Encryption** (optional): Protects sensitive .env file with GPG AES256 encryption
   ```bash
   ./scripts/backup.sh --encrypt
   # You'll be prompted for a passphrase
   ```

4. **Integrity Verification**: SHA256 checksums for all files, verified after backup

5. **Automatic Retention**: Automatically removes old backups beyond retention limit
   ```bash
   ./scripts/backup.sh --retain 30  # Keep last 30 backups
   ```

6. **Metadata Logging**: Captures backup details, sizes, checksums in `metadata.json`

### Example Output

```
==========================================
  FOAM N8N Backup Script
==========================================

[14:30:00] Checking Docker containers...
[14:30:01] Backup location: ./backups/foam-n8n-backup-20260125_143000

✓ PostgreSQL backup complete (2.4M)
✓ N8N data backup complete (15M)
✓ Workflow backup complete (456K)
✓ .env backed up (unencrypted)
⚠ Consider using --encrypt to protect sensitive credentials
✓ Config files backed up
✓ Metadata generated
✓ All 5 files verified successfully
✓ Removed 1 old backup(s)

==========================================
✓ Backup completed successfully!

  Location: ./backups/foam-n8n-backup-20260125_143000
  Size: 18M
  Encrypted: No
==========================================
```

## Restore Script (`restore.sh`)

### What Gets Restored

The restore script can restore all components or individual components as needed.

### Options

```
--backup-file DIR   Backup directory to restore from (required)
--decrypt           Decrypt encrypted backup with GPG passphrase
--no-confirm        Skip confirmation prompt (for automation)
--component NAME    Restore specific component only
--help              Show help message
```

### Component Options

| Component | What It Restores |
|-----------|------------------|
| `all` | Everything (default) |
| `db` | PostgreSQL database only |
| `n8n` | N8N data volume only |
| `env` | Environment configuration only |
| `workflows` | Workflow files only |
| `config` | Configuration files only |

### Safety Features

1. **Automatic Pre-Restore Backup**: Creates backup of current state before restore
   ```
   [14:35:00] Creating automatic backup of current state...
   ✓ Backup completed successfully!
   ```

2. **Confirmation Prompt**: Displays backup info and asks for confirmation
   ```
   ==========================================
     Backup Information
   ==========================================
     Name: foam-n8n-backup-20260125_120000
     Date: 2026-01-25T12:00:00+10:00
     Encrypted: false

     Components:
       postgres: true
       n8n_data: true
       workflows: true
       env_config: true
       config_files: true
   ==========================================

   ⚠ This will restore data from the backup and may overwrite current data.

   Are you sure you want to continue? (yes/no):
   ```

3. **Integrity Verification**: Verifies backup checksums before restore

4. **Service Management**: Automatically stops services before restore, starts after

5. **Health Checks**: Verifies all services are running correctly after restore

### Example Workflows

#### Full System Restore

```bash
# 1. List available backups
ls -lh ./backups/

# 2. Restore with confirmation
./scripts/restore.sh --backup-file ./backups/foam-n8n-backup-20260125_120000

# 3. System automatically:
#    - Creates backup of current state
#    - Verifies backup integrity
#    - Stops services
#    - Restores all components
#    - Starts services
#    - Runs health checks
```

#### Restore Only Database (for data corruption)

```bash
./scripts/restore.sh \
  --backup-file ./backups/foam-n8n-backup-20260125_120000 \
  --component db
```

#### Restore Encrypted Backup

```bash
./scripts/restore.sh \
  --backup-file ./backups/foam-n8n-backup-20260125_120000 \
  --decrypt
# You'll be prompted for the decryption passphrase
```

#### Automated Restore (no prompts)

```bash
./scripts/restore.sh \
  --backup-file ./backups/foam-n8n-backup-20260125_120000 \
  --no-confirm
```

### Example Output

```
==========================================
  FOAM N8N Restore Script
==========================================

[14:35:00] Verifying backup integrity...
✓ All 5 files verified successfully

==========================================
  Backup Information
==========================================
  Name: foam-n8n-backup-20260125_120000
  Date: 2026-01-25T12:00:00+10:00
  Encrypted: false

  Components:
    postgres: true
    n8n_data: true
    workflows: true
    env_config: true
    config_files: true
==========================================

[14:35:05] Creating automatic backup of current state...
✓ Backup completed successfully!

[14:35:30] Stopping Docker services...
✓ Services stopped

[14:35:35] Restoring PostgreSQL database...
✓ PostgreSQL database restored
[14:35:50] Restoring N8N data volume...
✓ N8N data restored
[14:35:55] Restoring workflow files...
✓ Workflows restored
[14:35:56] Restoring environment configuration...
✓ .env file restored
[14:35:57] Restoring configuration files...
✓ Config files restored

[14:36:00] Starting Docker services...
✓ Services started

[14:36:10] Running health checks...
✓ PostgreSQL is healthy
✓ N8N is healthy

✓ All health checks passed (2/2)

==========================================
✓ Restore completed successfully!

  Restored from: ./backups/foam-n8n-backup-20260125_120000
  Component: all

  N8N URL: http://localhost:5678
==========================================
```

## Automation

### Cron Job for Daily Backups

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM (keeps 30 days)
0 2 * * * cd /path/to/foam-n8n-implementation && ./scripts/backup.sh --output-dir /mnt/backups --encrypt --retain 30 --quiet
```

### Systemd Timer (Alternative to Cron)

Create `/etc/systemd/system/foam-backup.service`:

```ini
[Unit]
Description=FOAM N8N Backup Service
After=docker.service

[Service]
Type=oneshot
WorkingDirectory=/path/to/foam-n8n-implementation
ExecStart=/path/to/foam-n8n-implementation/scripts/backup.sh --output-dir /mnt/backups --encrypt --retain 30 --quiet
User=your-user
```

Create `/etc/systemd/system/foam-backup.timer`:

```ini
[Unit]
Description=FOAM N8N Daily Backup Timer

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable foam-backup.timer
sudo systemctl start foam-backup.timer

# Check status
sudo systemctl status foam-backup.timer
```

### Backup Before Updates

```bash
# Create backup before updating Docker images
./scripts/backup.sh --encrypt

# Update images
docker-compose pull

# Restart with new images
docker-compose up -d

# If issues occur, restore from backup
./scripts/restore.sh --backup-file ./backups/foam-n8n-backup-YYYYMMDD_HHMMSS --decrypt
```

## Disaster Recovery

### Complete System Failure

1. **Reinstall Docker and Docker Compose** on new system

2. **Clone repository or copy files**:
   ```bash
   git clone <repo-url> foam-n8n-implementation
   cd foam-n8n-implementation
   ```

3. **Copy backup to new system**:
   ```bash
   scp -r user@old-server:/backups/foam-n8n-backup-YYYYMMDD_HHMMSS ./backups/
   ```

4. **Restore from backup**:
   ```bash
   ./scripts/restore.sh --backup-file ./backups/foam-n8n-backup-YYYYMMDD_HHMMSS --decrypt
   ```

5. **Verify services**:
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

### Data Corruption

If database gets corrupted but files are intact:

```bash
# Restore only database
./scripts/restore.sh --backup-file ./backups/latest-backup --component db
```

### Accidental Deletion

If workflows are accidentally deleted:

```bash
# Restore only workflows
./scripts/restore.sh --backup-file ./backups/latest-backup --component workflows
```

## Best Practices

1. **Regular Backups**: Schedule daily automated backups

2. **Encryption**: Always use `--encrypt` for backups containing API keys

3. **Off-Site Storage**: Copy backups to remote location
   ```bash
   rsync -avz ./backups/ user@backup-server:/backups/foam-n8n/
   ```

4. **Test Restores**: Periodically test restore process in non-production environment

5. **Monitor Backup Size**: Check backup sizes to detect anomalies
   ```bash
   du -sh ./backups/foam-n8n-backup-*
   ```

6. **Document Passphrases**: Store encryption passphrases securely (password manager)

7. **Retention Policy**: Balance storage costs with recovery needs
   - Development: 7 days
   - Production: 30-90 days
   - Critical: 365+ days with monthly archives

## Troubleshooting

### Backup Issues

**Docker containers not running**:
```bash
cd /path/to/foam-n8n-implementation
docker-compose up -d
./scripts/backup.sh
```

**Permission denied**:
```bash
chmod +x ./scripts/backup.sh
```

**GPG not found** (for encryption):
```bash
# Ubuntu/Debian
sudo apt-get install gnupg

# macOS
brew install gnupg
```

### Restore Issues

**Services won't start after restore**:
```bash
# Check logs
docker-compose logs

# Try restarting
docker-compose down
docker-compose up -d
```

**Decryption failed**:
- Verify you're using the correct passphrase
- Check backup wasn't corrupted during transfer
- Verify GPG version compatibility

**Database restore fails**:
```bash
# Manually restore database
gunzip -c ./backups/foam-n8n-backup-YYYYMMDD_HHMMSS/postgres-dump.sql.gz | \
  docker exec -i foam-n8n-implementation-postgres-1 psql -U foam -d postgres
```

## Security Considerations

1. **Backup Encryption**: Always encrypt backups containing:
   - API keys (Anthropic, OpenAI, etc.)
   - Database credentials
   - N8N authentication credentials

2. **Passphrase Management**:
   - Use strong passphrases (16+ characters)
   - Store in secure password manager
   - Consider using GPG key instead of passphrase

3. **File Permissions**: Ensure backup directory has restricted permissions
   ```bash
   chmod 700 ./backups
   ```

4. **Transport Security**: Use encrypted channels for backup transfers
   ```bash
   # Good: rsync over SSH
   rsync -avz -e ssh ./backups/ user@server:/backups/

   # Avoid: unencrypted FTP
   ```

5. **Backup Verification**: Always verify checksums before restore

## Advanced Usage

### GPG Key-Based Encryption

Instead of passphrase, use GPG key:

```bash
# Generate GPG key (if not exists)
gpg --full-generate-key

# Modify backup.sh to use key
gpg --encrypt --recipient your-email@example.com .env
```

### Selective Component Backup

Create custom backup script for specific components:

```bash
#!/bin/bash
# backup-db-only.sh
source ./scripts/backup.sh

# Override to backup only database
backup_postgres "$BACKUP_PATH"
```

### Remote Backup Integration

```bash
#!/bin/bash
# backup-to-s3.sh

# Create backup
./scripts/backup.sh --encrypt --quiet

# Upload to S3
aws s3 sync ./backups/ s3://my-bucket/foam-n8n-backups/ \
  --exclude "*" \
  --include "foam-n8n-backup-*"
```

## File Structure

```
backups/
└── foam-n8n-backup-20260125_120000/
    ├── metadata.json              # Backup metadata and checksums
    ├── postgres-dump.sql.gz       # Database dump
    ├── n8n-data.tar.gz           # N8N user data
    ├── workflows.tar.gz          # Workflow definitions
    ├── .env.gpg                  # Encrypted environment config
    └── config.tar.gz             # Configuration files
```

## Related Documentation

- [IMPLEMENTATION_FRAMEWORK.md](../IMPLEMENTATION_FRAMEWORK.md) - Section 9: Deployment & Operations
- [docker-compose.yml](../docker-compose.yml) - Docker service definitions
- [TODO.md](../TODO.md) - Implementation roadmap

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review logs: `docker-compose logs`
3. Verify backup integrity: Check `metadata.json` checksums
4. Test in non-production environment first

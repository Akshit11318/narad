# NARAD Voting System — Mac Setup Guide (Clean Machine)

## 1. Install Prerequisites

```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# Install Docker Desktop
brew install --cask docker
open -a Docker
# Wait ~30s for Docker daemon to start, then verify:
docker info

# Install Node.js 20
brew install node@20

# Install Python 3 (macOS ships with it, but ensure pip)
brew install python3

# Install git (macOS ships with it, but update)
brew install git

# Install test dependencies
pip3 install psycopg2-binary pyjwt bcrypt
```

## 2. Clone with Submodules

```bash
git clone --recursive https://github.com/Akshit11318/narad.git
cd narad

# If you forgot --recursive, init submodules:
git submodule update --init --recursive

# Copy environment file
cp .env.example .env
```

## 3. Build & Start All Services

```bash
# Build Docker images (first time, ~5-10 min on fresh Mac)
make docker-build

# Start everything
make docker
```

Wait 60-90 seconds for Solana validator to become healthy:

```bash
# Check status (all should show Up/healthy)
make status
```

Expected:
```
narad-postgres   Up (healthy)
narad-solana     Up (healthy)
narad-backend    Up (healthy)
narad-portal     Up (healthy)
```

## 4. Database Migration

```bash
make db-migrate
```

## 5. Create Admin User

```bash
docker exec narad-postgres psql -U postgres -d voting -c \
  "INSERT INTO voter_data (\"voterId\", email, \"electionId\", role, ci, auxi, password, \"createdAt\", \"updatedAt\") \
   VALUES ('admin', 'admin@narad.io', 'bootstrap', 'admin', '', '', NULL, NOW(), NOW()) \
   ON CONFLICT (email) DO NOTHING;"

curl -s -X POST http://localhost:3000/api/voter/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@narad.io","password":"narad123"}'

docker exec narad-postgres psql -U postgres -d voting -c \
  "UPDATE voter_data SET role='admin' WHERE email='admin@narad.io';"
```

## 6. Access the App

| Service | URL |
|---------|-----|
| Portal | http://localhost:5173 |
| Admin Panel | http://localhost:5173/admin |
| Backend Health | http://localhost:3000/health |
| Database | localhost:5432 · postgres/postgres |

**Login:** `admin@narad.io` / `narad123`

## 7. Run Stress Test

```bash
# Small test
NUM_VOTERS=100 NUM_CANDIDATES=10 python3 test/full_system_test.py

# 10K voters
NUM_VOTERS=10000 NUM_CANDIDATES=10 python3 test/full_system_test.py

# Full 30M voters (uses all CPU cores)
NUM_VOTERS=30000000 NUM_CANDIDATES=10 python3 test/full_system_test.py
```

Results dumped to:
- `test_results_{voters}v_{candidates}c.json`
- `test_report_{voters}v_{candidates}c.md`

## 8. Troubleshooting

### "docker: Cannot connect to the daemon"
Docker Desktop isn't running. Start it:
```bash
open -a Docker
# Wait 30 seconds
docker info
```

### "make: docker: No such file or directory"
Docker isn't in PATH. Add it:
```bash
export PATH="/usr/local/bin:$PATH"
# Or for Apple Silicon:
export PATH="/opt/homebrew/bin:$PATH"
```

### Submodule error during docker build
The Dockerfile auto-clones libtommath if the submodule is empty. But if you see cmake errors:
```bash
git submodule update --init --recursive
make docker-build
```

### Solana validator not starting
```bash
docker logs narad-solana
# If it's still booting, just wait 60-90s
```

### Port 5173 already in use
```bash
lsof -i :5173
kill -9 <PID>
```

### pip3 install psycopg2-binary fails
```bash
brew install postgresql-16
pip3 install psycopg2-binary
```

### Backend not healthy
```bash
docker logs narad-backend
# Usually waiting for postgres or solana
```

### "cargo build-sbf" segfaults / SIGSEGV on Apple Silicon (M1/M2/M3)
The `tchambard/solana-test-validator` image is x86_64-only. On Apple Silicon Macs, Docker uses QEMU emulation by default, which crashes the Rust compiler (`rustc` segfaults with `signal: 11, SIGSEGV`).

**Fix: Enable Rosetta 2 for x86_64 emulation in Docker Desktop**

1. Open Docker Desktop → Settings → General
2. Check **"Use Rosetta for x86_64/amd64 emulation on Apple Silicon"**
3. Click **Apply & restart**

Or via CLI:
```bash
# Quit Docker
osascript -e 'quit app "Docker"'

# Enable Rosetta in settings
python3 -c "
import json, os
p = os.path.expanduser('~/Library/Group Containers/group.com.docker/settings-store.json')
d = json.load(open(p))
d['UseVirtualizationFrameworkRosetta'] = True
json.dump(d, open(p, 'w'), indent=2)
"

# Restart Docker
open -a Docker
# Wait ~30s, then verify:
docker info | grep -i rosetta
```

Then rebuild and deploy the Solana program:
```bash
make solana-build
make solana-deploy
```

### "Election creation failed: Attempt to load a program that does not exist"
The Solana program (`voting_sys`) is not deployed to the local validator. Build and deploy it:
```bash
make solana-build
make solana-deploy
```
Verify deployment:
```bash
docker exec narad-solana solana program show RhzKgCXcLLN1pJKLHK2MDbP6n8ijLW5pNWTDpfvsDKM --url http://localhost:8899
```

### "Port 5432 already allocated"
Another container or service is using port 5432. Find and stop it:
```bash
docker ps -a --format 'table {{.Names}}\t{{.Ports}}' | grep 5432
docker stop <container-name>
```
Then recreate narad-postgres:
```bash
docker compose up -d narad-postgres --force-recreate
```

### "Environment variable not found: DATABASE_URL"
The `.env` file is at the repo root but Prisma runs from `backend/`. Create a symlink:
```bash
cd backend && ln -s ../.env .env
```

### "npm ci can only install with an existing package-lock.json"
Generate the lockfile in `backend/`:
```bash
cd backend && npm install --package-lock-only
```

## 9. Rebuild After Code Changes

```bash
make rebuild-backend    # Backend changes
make rebuild-portal     # Portal changes
make rebuild-all        # Everything
```

## 10. Stop & Clean

```bash
make docker-down        # Stop services
make docker-clean       # Stop + delete volumes
```

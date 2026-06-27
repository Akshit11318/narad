.PHONY: all help install build up down clean test
.PHONY: docker docker-build docker-up docker-down docker-logs
.PHONY: db db-start db-migrate db-reset
.PHONY: solana solana-start solana-shell solana-build solana-test solana-deploy
.PHONY: wallet wallet-shell wallet-address wallet-balance wallet-airdrop
.PHONY: rebuild rebuild-backend rebuild-frontend rebuild-portal rebuild-all
.PHONY: test-all test-backend test-frontend test-solana

SHELL := /bin/bash

all: install build

help:
	@echo "╔═══════════════════════════════════════════════════════════╗"
	@echo "║           NARAD - Containerized Voting System             ║"
	@echo "╚═══════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🚀 Quick Start:"
	@echo "  make up                 Start everything"
	@echo "  make down               Stop everything"
	@echo ""
	@echo "🐳 Docker:"
	@echo "  make docker             Start core services"
	@echo "  make docker-full        Start all + wallet"
	@echo "  make docker-build       Build all images"
	@echo "  make docker-logs        View logs"
	@echo ""
	@echo "💰 Wallet:"
	@echo "  make wallet-start       Start wallet"
	@echo "  make wallet-address     Show address"
	@echo "  make wallet-balance     Show balance"
	@echo "  make wallet-airdrop     Get 100 SOL"
	@echo ""
	@echo "🔄 Rebuild:"
	@echo "  make rebuild-backend    Rebuild backend"
	@echo "  make rebuild-frontend   Rebuild frontend"
	@echo "  make rebuild-all        Rebuild everything"
	@echo ""
	@echo "🗄️ Database:"
	@echo "  make db-start           Start PostgreSQL"
	@echo "  make db-migrate         Run migrations"
	@echo "  make db-reset           Reset database"
	@echo ""
	@echo "☀️ Solana:"
	@echo "  make solana-start       Start validator"
	@echo "  make solana-shell       Open validator shell"
	@echo "  make solana-build       Build program"
	@echo "  make solana-deploy      Deploy program"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  make test               Run tests"
	@echo "  make test-all           Full test suite"

# ========================================
# DOCKER Commands
# ========================================

docker:
	docker compose up -d narad-postgres narad-solana narad-backend narad-portal

docker-full:
	docker compose --profile full up -d

docker-build:
	docker compose build --parallel

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-clean:
	docker compose down -v --remove-orphans
	docker network prune -f

up: docker
down: docker-down

# ========================================
# DATABASE Commands
# ========================================

db-start:
	@echo "🗄️ Starting NARAD PostgreSQL..."
	docker compose up -d narad-postgres
	@sleep 3
	@echo "✅ PostgreSQL running"

db-migrate:
	@echo "🗄️ Running migrations..."
	cd backend && npx prisma db push --accept-data-loss

db-reset:
	@echo "🗄️ Resetting NARAD database..."
	docker exec narad-postgres psql -U postgres -c "DROP DATABASE IF EXISTS voting;"
	docker exec narad-postgres psql -U postgres -c "CREATE DATABASE voting;"
	cd backend && npx prisma db push --accept-data-loss

# ========================================
# SOLANA Commands
# ========================================

solana-start:
	@echo "☀️ Starting NARAD Solana validator..."
	docker compose up -d narad-solana
	@echo "⏳ Wait ~60s for validator..."
	@sleep 60
	@echo "✅ Validator at http://localhost:8899"

solana-shell:
	@echo "☀️ Opening Solana shell..."
	docker exec -it narad-solana bash

solana-build:
	@echo "☀️ Building Solana program..."
	docker exec -w /working-dir narad-solana sh -c "cargo build-sbf"
	@echo "✅ Built: target/deploy/voting_sys.so"

solana-deploy:
	@echo "☀️ Deploying Solana program..."
	docker exec -w /working-dir narad-solana sh -c "anchor deploy"
	@echo "✅ Deployed"

solana-test:
	@echo "☀️ Running Solana tests..."
	docker exec -w /working-dir narad-solana sh -c "anchor test --skip-local-validator"

# ========================================
# WALLET Commands
# ========================================

wallet-start:
	@echo "💰 Starting NARAD wallet..."
	docker compose --profile wallet up -d narad-wallet
	@sleep 5
	@echo "✅ Wallet ready"

wallet-shell:
	docker exec -it narad-wallet bash

wallet-address:
	@echo "💰 NARAD Wallet Address:"
	@docker exec narad-wallet solana address

wallet-balance:
	@echo "💰 NARAD Wallet Balance:"
	@docker exec narad-wallet solana balance

wallet-airdrop:
	@echo "💰 Airdropping 100 SOL..."
	@docker exec narad-wallet solana airdrop 100
	@$(MAKE) wallet-balance

# ========================================
# REBUILD Commands
# ========================================

rebuild-backend:
	@echo "🔄 Rebuilding narad-backend..."
	docker compose build narad-backend
	docker compose up -d narad-backend
	@echo "✅ Backend rebuilt"

rebuild-frontend:
	@echo "🔄 Rebuilding narad-frontend..."
	docker compose build narad-frontend
	docker compose up -d narad-frontend
	@echo "✅ Frontend rebuilt"

rebuild-portal:
	@echo "🔄 Rebuilding narad-portal..."
	docker compose build narad-portal
	docker compose up -d narad-portal
	@echo "✅ Portal rebuilt"

rebuild-all:
	@echo "🔄 Rebuilding all NARAD services..."
	docker compose build --no-cache
	docker compose up -d
	@echo "✅ All rebuilt"

rebuild:
	$(MAKE) rebuild-backend

restart-all:
	docker compose restart

# ========================================
# BUILD Commands
# ========================================

build-wasm:
	@echo "🔨 Building WASM..."
	@test -d build-wasm || mkdir -p build-wasm
	cd build-wasm && emcmake cmake ../frontend/src/wasm -DCMAKE_BUILD_TYPE=Release
	cd build-wasm && cmake --build . --config Release
	cp build-wasm/encryption.js frontend/public/assets/
	cp build-wasm/encryption.wasm frontend/public/assets/
	cp build-wasm/encryption.js portal/public/assets/
	cp build-wasm/encryption.wasm portal/public/assets/
	@echo "✅ WASM built"

build:
	cd backend && npm run build
	@echo "✅ Backend built"

# ========================================
# TEST Commands
# ========================================

test:
	cd backend && npm test

test-all:
	cd backend && npm test

# ========================================
# UTILITY Commands
# ========================================

status:
	@echo "📊 NARAD Service Status:"
	@docker compose ps

clean:
	rm -rf build-wasm/
	rm -rf backend/dist/
	rm -rf frontend/dist/
	rm -rf portal/dist/

clean-all: clean
	rm -rf node_modules/
	rm -rf backend/node_modules/
	rm -rf frontend/node_modules/
	rm -rf portal/node_modules/
	docker compose down -v

logs-backend:
	docker compose logs -f narad-backend

logs-solana:
	docker compose logs -f narad-solana

logs-wallet:
	docker compose logs -f narad-wallet

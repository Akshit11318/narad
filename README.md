# Voting System - Containerized Blockchain Voting Platform

A secure, containerized voting system built on Solana blockchain with WebAssembly-based client-side cryptography.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Compose                          │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│   Frontend  │    Portal   │   Backend   │   PostgreSQL     │
│   (nginx)   │   (nginx)   │   (Node)    │   (postgres)     │
│   :5173     │   :5174     │   :3000     │   :5432         │
└─────────────┴─────────────┴─────────────┴─────────────────┘
│                      │
│              Solana Test Validator
│                  (localhost:8899)
└─────────────────────────────────────────────────────────────┘
```

### Microservices

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 5173 | React voting interface |
| Portal | 5174 | Admin/management portal |
| Backend | 3000 | Express API server |
| PostgreSQL | 5432 | Database for election data |
| Solana | 8899 | Blockchain validator |

## Quick Start

### Prerequisites

- Docker & Docker Compose (recommended)
- OR Node.js 20+, Emscripten 4.0+, Solana CLI 2.0+

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/votingSys.git
cd votingSys

# Start all services
make docker

# Or manually
docker-compose up -d
```

Services will be available at:
- Frontend: http://localhost:5173
- Portal: http://localhost:5174
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432

### Development Setup

```bash
# Install dependencies
make install

# Build WebAssembly module (requires Emscripten)
make build-wasm

# Start infrastructure
make db-start
make solana-start

# Run backend in development
make dev-local

# Run frontend in development
make dev-frontend
```

## Available Commands

Run `make help` for full command list.

### Common Operations

```bash
# Docker
make docker          # Start all services
make docker-down     # Stop services
make docker-logs     # View logs
make docker-build    # Rebuild images

# Building
make build           # Build everything
make build-wasm      # Build WASM module
make build-solana    # Build Solana program

# Database
make db-migrate      # Run migrations
make db-studio       # Open Prisma Studio
make db-reset        # Reset database

# Solana
make solana-deploy   # Deploy program
make solana-test     # Run tests
```

## Project Structure

```
votingSys/
├── docker/                 # Docker configurations
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   ├── portal.Dockerfile
│   └── nginx.conf
├── backend/           # Backend API (Express + Prisma)
│   ├── src/
│   ├── prisma/
│   └── package.json
├── frontend/              # React voting interface
│   ├── src/
│   ├── public/assets/     # WASM files
│   └── package.json
├── portal/                # Admin portal
│   ├── src/
│   └── package.json
├── programs/              # Solana programs (Anchor)
│   └── voting-sys/
│       └── src/lib.rs
├── frontend/src/wasm/     # WASM crypto module
├── docker-compose.yml     # Production compose
├── docker-compose.dev.yml # Development compose
├── Makefile               # Build commands
└── README.md
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection | postgresql://postgres:postgres@localhost:5432/voting |
| JWT_SECRET | JWT signing key | (change in production!) |
| SOLANA_RPC_URL | Solana RPC endpoint | http://localhost:8899 |
| PORT | Backend port | 3000 |

### Database Migrations

```bash
# Development
make db-migrate

# Production (in Docker)
docker-compose exec backend npx prisma migrate deploy
```

## Testing

```bash
# Run all tests
make test

# Run Solana tests
make solana-test

# View coverage
cd backend && npm test -- --coverage
```

## Deployment

### Production Docker

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Deploy with environment file
docker-compose -f docker-compose.yml up -d
```

### Kubernetes (Helm)

```bash
# Coming soon - helm charts in /helm/
```

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **Backend**: Node.js 20, Express, Prisma ORM
- **Blockchain**: Solana, Anchor 0.30
- **Cryptography**: WebAssembly (Emscripten), libtommath
- **Database**: PostgreSQL 16
- **Container**: Docker, Docker Compose

## Security

- All votes are encrypted client-side using WASM cryptography
- Zero-knowledge proof integration for vote verification
- JWT authentication for admin operations
- Solana blockchain for immutable vote storage

## Development Workflow

1. **Feature Development**:
   ```bash
   git checkout -b feature/my-feature
   make dev          # Start dev environment
   # Make changes...
   make lint         # Lint code
   make test         # Run tests
   git push origin feature/my-feature
   ```

2. **Build WASM**:
   ```bash
   make build-wasm
   ```

3. **Database Changes**:
   ```bash
   cd backend
   npx prisma migrate dev --name my_migration
   ```

## Troubleshooting

### WASM Build Fails

Ensure Emscripten is properly installed:
```bash
source ~/emsdk/emsdk_env.sh
make build-wasm
```

### Docker Issues

```bash
# Clean everything
make clean-all
make docker-build
make docker-up
```

### Database Connection

```bash
# Check PostgreSQL is running
make status

# Reset database
make db-reset
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Build and test (`make build test`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing`)
6. Open Pull Request

## License

ISC License - see LICENSE file for details.

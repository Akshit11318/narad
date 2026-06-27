# NARAD Backend Service
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential python3 curl openssl cmake git \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g cmake-js

# Copy package files (including package-lock.json for npm ci)
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci

# Copy git files needed for submodule init
COPY .gitmodules ./
# Copy deps with submodules — on a fresh clone, submodules need init
# The .dockerignore excludes .git, so we init submodules from the already-checked-out deps
COPY deps ./deps
COPY common ./common
COPY aggregator ./aggregator

# If submodules are empty (fresh clone without --recursive), clone them
RUN if [ ! -d deps/libtommath/.git ]; then \
      git clone https://github.com/libtom/libtommath.git deps/libtommath; \
    fi
RUN if [ ! -d deps/curl/.git ]; then \
      git clone https://github.com/curl/curl.git deps/curl; \
    fi

# Build native aggregator addon (libtommath)
WORKDIR /app/aggregator
RUN npm install
RUN cmake-js compile
WORKDIR /app

# Build backend
COPY backend/tsconfig.json ./
COPY backend/src ./src/
COPY backend/voting_sys.json ./
RUN npm run build
RUN npx prisma generate
RUN cp voting_sys.json dist/

FROM node:20-bookworm-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/aggregator/build/build/Release/aggregator.node ./aggregator/build/build/Release/aggregator.node

EXPOSE 3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]

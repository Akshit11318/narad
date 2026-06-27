# NARAD Backend Service
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential python3 curl openssl cmake \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g cmake-js

COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci

# Build native aggregator addon
COPY aggregator ./aggregator
COPY common ./common
COPY deps ./deps
WORKDIR /app/aggregator
RUN npm install
RUN cmake-js compile
WORKDIR /app

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

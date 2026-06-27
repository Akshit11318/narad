# Portal Service - Admin/voter portal
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

COPY portal/package*.json ./
COPY portal/vite.config.ts ./
COPY portal/tsconfig.json ./
COPY portal/tsconfig.app.json ./
COPY portal/tsconfig.node.json ./
COPY portal/index.html ./
COPY portal/postcss.config.js ./
COPY portal/tailwind.config.js ./

RUN npm ci

COPY portal/src ./src
COPY portal/public ./public

RUN npm run build

FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

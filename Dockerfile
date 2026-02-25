# ── Stage 1: Build Vite frontend ─────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Combined runtime (nginx + Node.js) ───────────────────
FROM node:20-alpine

# Install nginx and openssl (required by Prisma on musl/Alpine)
RUN apk add --no-cache nginx openssl

# ── Backend setup ─────────────────────────────────────────────────
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./
RUN npx prisma generate

# ── Frontend static files ─────────────────────────────────────────
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# ── nginx config ──────────────────────────────────────────────────
COPY frontend/nginx.conf /etc/nginx/http.d/default.conf

# ── Startup script ────────────────────────────────────────────────
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]

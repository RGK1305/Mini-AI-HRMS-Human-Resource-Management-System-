# ── Stage 1: Build Vite app ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Stage 2: Serve with nginx ────────────────────────────────────
FROM nginx:alpine

# envsubst is in gettext — used to inject BACKEND_URL at container startup
RUN apk add --no-cache gettext

COPY --from=builder /app/dist /usr/share/nginx/html
# Copy as template — envsubst will fill in ${BACKEND_URL} at runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

EXPOSE 80

# Substitute env vars into nginx config, then start nginx
CMD ["/bin/sh", "-c", "envsubst '${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

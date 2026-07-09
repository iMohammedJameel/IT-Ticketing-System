# Backend image — multi-stage build keeps the final image small.
# Stage 1: install prod dependencies only (no devDeps).
# Stage 2: copy app code + prod node_modules onto a slim Node image.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Install tini for proper PID 1 signal handling (graceful shutdown works)
RUN apk add --no-cache tini
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Create uploads directory with correct ownership
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "app.js"]

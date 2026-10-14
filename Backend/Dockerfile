# Backend image — multi-stage build keeps the final image small.
# © 2026 Mohammed Jameel — https://imohammedjameel.github.io/ (MIT, see LICENSE)
# Attribution labels below show up in `docker inspect` on the built image.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:20-alpine AS runtime
# OCI image labels — author attribution visible via docker inspect
LABEL org.opencontainers.image.title="Jameel IT Help Desk — Backend API"
LABEL org.opencontainers.image.authors="Mohammed Jameel <https://imohammedjameel.github.io/>"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.vendor="Mohammed Jameel"
WORKDIR /app
ENV NODE_ENV=production
# Install tini for proper PID 1 signal handling (graceful shutdown works)
RUN apk add --no-cache tini
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Create uploads directory with correct ownership
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
# PERSISTENT STORAGE — uploads (attachments + avatars) must survive container
# replacement. Declaring VOLUME prevents accidental anonymous-fs data loss on
# `docker run` and pairs with the named volume in docker-compose.yml.
VOLUME ["/app/uploads"]
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "app.js"]

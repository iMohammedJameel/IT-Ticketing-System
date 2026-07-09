# Frontend image — multi-stage.
# Stage 1: build the static bundle with Vite.
# Stage 2: serve it with nginx.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . .
# VITE_API_URL is set at build time — relative path so nginx can proxy /api to backend
ENV VITE_API_URL=/api
ENV VITE_WS_URL=
RUN npm run build

FROM nginx:1.27-alpine AS runtime
# Replace default config with our SPA-aware one
COPY deploy/nginx/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]

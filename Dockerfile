# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE=
ENV VITE_API_BASE=$VITE_API_BASE
# vite lives in devDependencies. Jenkins/Docker NODE_ENV=production would
# make `npm ci` skip it and fail with `sh: vite: not found`.
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false
ENV NODE_OPTIONS=--dns-result-order=ipv4first
ENV NPM_CONFIG_FETCH_RETRIES=10
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=10000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_FETCH_TIMEOUT=300000
ENV NPM_CONFIG_MAXSOCKETS=3

COPY package.json package-lock.json ./
RUN set -e; \
  i=0; \
  until npm ci --include=dev --no-audit --no-fund; do \
    i=$((i + 1)); \
    if [ "$i" -ge 6 ]; then exit 1; fi; \
    echo "npm ci failed (attempt $i/6), retrying in 15s..."; \
    sleep 15; \
  done

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

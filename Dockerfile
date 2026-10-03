FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --include=dev
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates gosu tini && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV LOCAL_SETUP_ENABLED=false
ENV PORT=8080
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/src/lib/content.ts ./src/lib/content.ts
COPY --from=build --chown=node:node /app/src/lib/domain.ts ./src/lib/domain.ts
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/deployment/bootstrap-admin.json ./deployment/bootstrap-admin.json
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json /app/next.config.ts /app/tsconfig.json ./
RUN mkdir -p storage/uploads && chown -R node:node storage && sed -i 's/\r$//' scripts/docker-entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["/usr/bin/tini", "--", "/bin/sh", "scripts/docker-entrypoint.sh"]
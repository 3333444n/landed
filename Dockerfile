# Release image for the packaged user installation (ADR 003). Built by compose.release.yml.
# Contributors keep running Next.js locally with `pnpm dev`; this file is not used by them.

# Stage 1: install dependencies and build the standalone server.
FROM node:22.23-bookworm-slim AS build
WORKDIR /app
# corepack installs the pnpm version pinned in package.json, so the image and the repository
# resolve the lockfile with the same tool.
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Telemetry is off so the build (and later the server) makes no outbound requests.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build
# The migration runner (db/migrate.mjs) imports drizzle-orm as a package. Next.js bundles
# drizzle-orm into the server output instead of tracing it, so the standalone tree lacks it;
# copy the resolved package (cp -L follows pnpm's symlinks). pg is already traced.
RUN cp -RL node_modules/drizzle-orm .next/standalone/node_modules/drizzle-orm

# Stage 2: runtime. Only the traced server, static assets and the migration files are kept.
FROM node:22.23-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
# server.js from `output: "standalone"` listens on HOSTNAME:PORT. 0.0.0.0 here means "all
# interfaces inside the container"; what reaches the host is decided by the `ports` entry in
# compose.release.yml, which binds 127.0.0.1 only.
ENV HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/db/migrations ./db/migrations
COPY --from=build --chown=node:node /app/db/migrate.mjs ./db/migrate.mjs
# The base image ships an unprivileged `node` user; the app needs no root at runtime.
USER node
EXPOSE 3000
CMD ["node", "server.js"]

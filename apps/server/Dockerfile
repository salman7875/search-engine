# STAGE 1 - PRUNE LAYER
FROM node:24-bookworm-slim AS pruner
RUN npm i -g turbo
WORKDIR /app
COPY . .
RUN turbo prune --scope=@repo/server --docker --out-dir=json-pruned


# STAGE 2 - BASE LAYER (includes build dependencies for native packages like SQLite/Sharp)
FROM node:24-bookworm-slim AS base
WORKDIR /monorepo
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*


# STAGE 3 - BUILDER LAYER (installing deps using Turbo's pruned lockfile)
FROM base AS builder
COPY --from=pruner /app/json-pruned/json/ .
COPY package-lock.json package.json ./
RUN --mount=type=cache,id=npm,target=/root/.npm npm i  


# STAGE 4 - DEV LAYER
FROM builder AS dev
RUN npm i -g turbo
COPY --from=pruner /app/json-pruned/full/ .
EXPOSE 3000
CMD ["turbo", "run", "dev", "--filter=@repo/server"]


# STAGE 5 - COPY FULL SOURCE CODE AND BUILD THE SERVER
FROM builder AS compiled-builder
COPY --from=pruner /app/json-pruned/full/ .
RUN npm run build --filter=@repo/server


# STAGE 6 - PRODUCTION LAYER
FROM builder AS prod-installer
COPY --from=pruner /app/json-pruned/json/ .
COPY package-lock.json package.json ./
RUN --mount=type=cache,id=npm,target=/root/.npm npm i


# STAGE 7 - FINAL LAYER (That runs production image)
FROM node:24-bookworm-slim AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# GIVING ACCESS TO USER NODE FOR ACCESSING SQLITE
RUN mkdir -p /usr/src/app/data && chown -R node:node /usr/src/app

USER node

COPY --chown=node:node --from=prod-installer /monorepo ./
COPY --chown=node:node --from=compiled-builder /monorepo/apps/server/dist ./apps/server/dist

ENV DATABASE_URL=/usr/src/app/data/test.db

EXPOSE 3000
CMD ["node", "apps/server/dist/server.js"]

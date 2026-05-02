FROM oven/bun:1.1.45 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    SEARCH_TIMEOUT_MS=5000 \
    LOG_LEVEL=info
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["bun", "src/index.ts"]

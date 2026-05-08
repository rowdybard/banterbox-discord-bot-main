# ---- builder ----
FROM node:20-slim AS builder

# Build tools for native modules (@discordjs/opus)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Prune to production deps only (build tools still present for native rebuild if needed)
RUN npm prune --omit=dev

# ---- runtime ----
FROM node:20-slim

# ffmpeg required for Opus → MP3 decode in the STT pipeline
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy pruned node_modules (includes compiled @discordjs/opus binary)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/server/index.js"]

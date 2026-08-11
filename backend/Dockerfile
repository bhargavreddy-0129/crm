# Stage 1: Builder
FROM node:20-bookworm-slim AS builder

# Install OpenSSL and CA certificates for Prisma and Debian compatibility
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definition files
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript build)
RUN npm ci

# Copy Prisma schema and generate Prisma Client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy backend source code
COPY . .

# Build TypeScript source to dist/
RUN npm run build

# Stage 2: Production Runner
FROM node:20-bookworm-slim AS runner

# Install OpenSSL and CA certificates for runtime Prisma engine execution
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Copy built artifacts and dependencies from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Railway overrides process.env.PORT dynamically at runtime
EXPOSE 5000

# Sync database schema and seed if needed, then start server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx ts-node prisma/seed.ts && node dist/server.js"]

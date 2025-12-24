# Build arguments
ARG nodeVersion=24

# Builder stage
FROM node:${nodeVersion}-alpine AS builder

# Enable corepack for pnpm (included in Node.js 16.9+)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Fetch dependencies to store store directory (offline install preparation)
# This creates a cache that can be reused for faster rebuilds
RUN pnpm fetch --frozen-lockfile

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile --offline

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:${nodeVersion}-alpine AS api

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Fetch only production dependencies
RUN pnpm fetch --frozen-lockfile --prod

# Install only production dependencies using offline mode (faster, uses fetched cache)
RUN NODE_ENV=production pnpm install --frozen-lockfile --offline --prod

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership of app directory to non-root user
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/main"]

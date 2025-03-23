FROM node:16-alpine

WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Expose the API port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV BLOCKCHAIN_API_URL=http://blockchain-core:5000
ENV REDIS_URL=redis://redis:6379

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start the server
CMD ["node", "server.js"]

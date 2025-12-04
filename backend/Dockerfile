FROM node:20-alpine

WORKDIR /app

# Copy package files first
COPY package.json ./

# Install dependencies fresh
RUN npm install

# Copy source code only (not node_modules)
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript using npx
RUN npx tsc

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "dist/index.js"]

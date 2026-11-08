# syntax=docker/dockerfile:1

# ------------------------------------------------------------------------------
# Stage 1: Build React/Vite Static Bundle
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for Docker cache optimization
COPY package*.json ./
RUN npm ci

# Copy source and build production bundle
COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Serve with Nginx Alpine
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


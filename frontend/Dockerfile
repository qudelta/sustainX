# 1. Base stage with system dependencies
FROM node:20-alpine AS base
WORKDIR /app

# 2. Dependencies stage (cached)
FROM base AS dependencies
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# 3. Development stage (inherits node_modules from base)
# We use a trick: builder/dev stages inherit from dependencies but we don't COPY --from
# because they ARE the same file system layers.
FROM dependencies AS development
EXPOSE 3000
CMD ["npm", "run", "dev"]

# 4. Build stage (inherits node_modules from dependencies)
FROM dependencies AS builder
COPY . .
RUN npm run build

# 5. Production stage (Final)
FROM nginx:alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user
RUN adduser -D -u 1001 appuser && \
    chown -R appuser:appuser /usr/share/nginx/html && \
    chown -R appuser:appuser /var/cache/nginx && \
    chown -R appuser:appuser /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appuser /var/run/nginx.pid

USER appuser

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

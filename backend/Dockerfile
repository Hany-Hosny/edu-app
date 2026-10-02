# Stage 1: install backend production dependencies
FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

RUN npm ci \
    --omit=dev \
    --workspace backend \
    --include-workspace-root=false


# Stage 2: runtime
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node backend/package.json ./backend/package.json
COPY --chown=node:node backend/src ./backend/src

USER node

EXPOSE 5050

CMD ["npm", "run", "start", "--workspace", "backend"]
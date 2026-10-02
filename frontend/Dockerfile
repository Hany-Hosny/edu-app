FROM node:20-slim AS build

WORKDIR /app

ARG TARGETARCH
ARG VITE_API_URL

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json

RUN npm ci --workspace frontend --include-workspace-root=false

RUN case "${TARGETARCH}" in \
      "amd64") \
        npm install --no-save --package-lock=false \
        --workspace frontend \
        @rolldown/binding-linux-x64-gnu \
        ;; \
      "arm64") \
        npm install --no-save --package-lock=false \
        --workspace frontend \
        @rolldown/binding-linux-arm64-gnu \
        ;; \
      *) \
        echo "Unsupported architecture: ${TARGETARCH}" && exit 1 \
        ;; \
    esac

COPY frontend ./frontend

ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build --workspace frontend


FROM nginx:alpine AS runtime

COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
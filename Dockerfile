FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV VITE_AUTH_ENABLED=false
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/.output /app/.output

USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

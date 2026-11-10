FROM node:24-bookworm-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json drizzle.config.ts openapi.yaml ./
COPY src ./src
COPY drizzle ./drizzle
RUN npm run build

# The tools target retains the development dependencies needed by Drizzle Kit
# and the TypeScript administrator seed script.
FROM build AS tools
CMD ["npx", "drizzle-kit", "migrate"]

FROM build AS production-dependencies
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/openapi.yaml ./openapi.yaml
USER node
EXPOSE 5000
CMD ["node", "dist/server.js"]

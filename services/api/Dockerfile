FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@11.23.0

FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY services/api ./services/api
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @medikiosk/shared-types build || true
RUN pnpm --filter @medikiosk/clinical-schema build || true
RUN pnpm --filter @medikiosk/api build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/api/package.json ./services/api/package.json
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/node_modules ./services/api/node_modules

EXPOSE 4000
CMD ["node", "services/api/dist/server.js"]

FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@11.23.0

FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY apps/kiosk ./apps/kiosk
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @medikiosk/kiosk build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/apps/kiosk/package.json ./apps/kiosk/package.json
COPY --from=builder /app/apps/kiosk/.next ./apps/kiosk/.next
COPY --from=builder /app/apps/kiosk/public ./apps/kiosk/public
COPY --from=builder /app/apps/kiosk/node_modules ./apps/kiosk/node_modules
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/apps/kiosk
EXPOSE 3000
CMD ["pnpm", "start"]

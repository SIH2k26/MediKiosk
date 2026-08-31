FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@11.23.0

FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY apps/doctor ./apps/doctor
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @medikiosk/doctor build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/apps/doctor/package.json ./apps/doctor/package.json
COPY --from=builder /app/apps/doctor/.next ./apps/doctor/.next
COPY --from=builder /app/apps/doctor/public ./apps/doctor/public
COPY --from=builder /app/apps/doctor/node_modules ./apps/doctor/node_modules
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/apps/doctor
EXPOSE 3001
CMD ["pnpm", "start"]

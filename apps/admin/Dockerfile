FROM node:20-alpine AS base
WORKDIR /repo

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/admin/package.json apps/admin/package.json
RUN npm install

FROM deps AS build
COPY apps/admin apps/admin
ARG NEXT_PUBLIC_TELEGRAM_ADMIN_BOT_USERNAME
ARG NEXT_PUBLIC_ENABLE_DEV_LOGIN
# Той самий фікс, що в apps/web/Dockerfile (детальний коментар там) —
# Next.js "запікає" async rewrites() з next.config.mjs на етапі next
# build, тому API_INTERNAL_URL має бути доступний саме тут, не тільки в
# рантайм-environment: docker-compose.yml.
ARG API_INTERNAL_URL
ENV NEXT_PUBLIC_TELEGRAM_ADMIN_BOT_USERNAME=$NEXT_PUBLIC_TELEGRAM_ADMIN_BOT_USERNAME
ENV NEXT_PUBLIC_ENABLE_DEV_LOGIN=$NEXT_PUBLIC_ENABLE_DEV_LOGIN
ENV API_INTERNAL_URL=$API_INTERNAL_URL
RUN npm run build --workspace=apps/admin

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/admin/.next ./apps/admin/.next
COPY --from=build /repo/apps/admin/package.json ./apps/admin/package.json
COPY --from=build /repo/apps/admin/next.config.mjs ./apps/admin/next.config.mjs
EXPOSE 3000
WORKDIR /repo/apps/admin
CMD ["npx", "next", "start", "-p", "3000"]

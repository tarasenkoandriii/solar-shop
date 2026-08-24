FROM node:20-alpine AS base
WORKDIR /repo

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
RUN npm install

FROM deps AS build
COPY apps/web apps/web
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ENABLE_DEV_LOGIN
# Кнопка "Dev-вхід (адмінка)" у Header.tsx — той самий клас проблеми, що
# API_INTERNAL_URL нижче (NEXT_PUBLIC_* запікається в клієнтський бандл
# на етапі build, не в рантаймі).
ARG NEXT_PUBLIC_ADMIN_URL
# Знайдено на реальному Docker-деплої (18.08.2026): Next.js обчислює
# `async rewrites()` з next.config.mjs ТІЛЬКИ на етапі `next build`, не в
# рантаймі (задокументоване обмеження Next.js, підтверджено пошуком —
# github.com/vercel/next.js issues #33931/#21888: "rewrites are only
# configurable at build time"). Без ARG тут `API_INTERNAL_URL` під час
# білду був undefined → next.config.mjs брав дефолт
# 'http://localhost:3001' → це значення "запікалось" у зібраний
# routes-manifest НАЗАВЖДИ — рантайм-`environment:` з docker-compose.yml
# вже нічого не міняв, тому web намагався проксіювати сам на себе
# (localhost:3001 всередині контейнера web — порт, де нічого не слухає) і
# падав з ECONNREFUSED. Значення тут ідентичне рантайм-`environment:` в
# docker-compose.yml (`http://api:3001`) — сам рядок не потребує реальної
# мережевої доступності під час білду, тільки коректно записується в
# маніфест.
ARG API_INTERNAL_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ENABLE_DEV_LOGIN=$NEXT_PUBLIC_ENABLE_DEV_LOGIN
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
ENV API_INTERNAL_URL=$API_INTERNAL_URL
RUN npm run build --workspace=apps/web

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/web/.next ./apps/web/.next
COPY --from=build /repo/apps/web/public ./apps/web/public
COPY --from=build /repo/apps/web/package.json ./apps/web/package.json
COPY --from=build /repo/apps/web/next.config.mjs ./apps/web/next.config.mjs
EXPOSE 3000
WORKDIR /repo/apps/web
CMD ["npx", "next", "start", "-p", "3000"]

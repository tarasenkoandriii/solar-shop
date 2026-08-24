FROM node:20-alpine AS base
WORKDIR /repo
# openssl потрібен Prisma для коректного визначення версії libssl на
# етапі generate (без нього Prisma намагається вгадати і помиляється —
# див. коментар у packages/db/prisma/schema.prisma generator client).
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/db/package.json packages/db/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm install

FROM deps AS build
COPY packages/db packages/db
COPY apps/api apps/api
RUN npm run generate --workspace=packages/db
# Знайдено при реальному Docker-деплої (18.08.2026): @solar-shop/db раніше
# не мав власної збірки — package.json вказував main/types напряму на
# src/index.ts (сирий TS), через npm workspace symlink резолвився в
# apps/api як звичайний вихідний файл для КОМПІЛЯЦІЇ, не тільки для типів.
# Без явного rootDir у apps/api/tsconfig.json TypeScript обчислював
# спільний корінь між apps/api/src і packages/db/src, і клав
# скомпільований main.js кудись на кшталт dist/apps/api/src/main.js
# замість очікуваного dist/main.js — саме тому контейнер падав з
# "Cannot find module '/repo/apps/api/dist/main.js'". Тепер packages/db
# має власний build-крок (компілюється в packages/db/dist ДО того, як
# apps/api його імпортує) — apps/api бачить лише скомпільований
# .d.ts/.js, не сирі .ts-файли, і TypeScript більше не намагається їх
# переемітити як частину своєї збірки.
RUN npm run build --workspace=packages/db
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runner
WORKDIR /repo
# Той самий openssl, що й у build-стадії (окремий FROM — нічого не
# успадковується) — рушію Prisma він потрібен і в рантаймі, не тільки на
# generate. Без цього — "Error loading shared library libssl.so.1.1: No
# such file or directory", навіть якщо generate під час білду відпрацював
# коректно (детекція версії й фактична бібліотека в рантаймі — різні речі).
RUN apk add --no-cache openssl
# За запитом користувача — headless-браузер (puppeteer-core + системний
# Chromium через apk, НЕ через завантаження власного бінарника
# puppeteer) для проходження JS-based бот-захисту (Cloudflare/Akamai/
# Imperva Incapsula — підтверджено НАЖИВО на реальному прогоні,
# oschadbank.ua), коли звичайний fetch() не може отримати og:image.
# Свідомий вибір: system Chromium через apk (не npm-завантажений
# бінарник) — сумісний з musl (Alpine), перевірений роками патерн для
# puppeteer на Alpine (підтверджено кількома незалежними джерелами через
# web_search). PUPPETEER_SKIP_CHROMIUM_DOWNLOAD — щоб npm install НЕ
# намагався додатково стягнути власний Chromium (~280МБ), використовуємо
# лише system-пакет.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# ВАЖНО: NODE_ENV НЕ задаётся тут жёстко (было "production" — конфликтовало
# с ENABLE_DEV_LOGIN, который требует NODE_ENV != "production" на рантайме,
# см. AuthService.assertDevLoginEnabled). docker-compose.yml сам передаёт
# NODE_ENV: development через environment: — этого достаточно для локальной
# разработки. Если образ когда-нибудь будет запускаться напряму (не через
# docker-compose із цього репо) без явного NODE_ENV — задай його вручную при
# запуску контейнера (`docker run -e NODE_ENV=production ...`), не покладайся
# на дефолт із образу.
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/db ./packages/db
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
EXPOSE 3001
# Знайдено 18.08.2026: у репозиторії досі НЕМАЄ жодної Prisma-міграції
# (packages/db/prisma/migrations/ не існує — в пісочниці, де писався код,
# не було мережі до binaries.prisma.sh, тому `prisma migrate dev` жодного
# разу не запускався успішно).
#
# Виправлення — самодостатній скрипт entrypoint.sh (нижче), що викликає
# спільний scripts/db-bootstrap.js (той самий скрипт переюзаний і в
# Vercel-деплої через "vercel-build" в apps/api/package.json — щоб логіка
# не розходилась між двома шляхами деплою) — детальний опис самої логіки
# migrate/push/seed дивись у коментарях db-bootstrap.js.
COPY scripts/db-bootstrap.js /repo/scripts/db-bootstrap.js
COPY apps/api/entrypoint.sh /repo/entrypoint.sh
RUN chmod +x /repo/entrypoint.sh
CMD ["/repo/entrypoint.sh"]

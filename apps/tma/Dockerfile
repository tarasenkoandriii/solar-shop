FROM node:20-alpine AS base
WORKDIR /repo

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/tma/package.json apps/tma/package.json
RUN npm install

FROM deps AS build
COPY apps/tma apps/tma
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build --workspace=apps/tma

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/tma/.next ./apps/tma/.next
COPY --from=build /repo/apps/tma/package.json ./apps/tma/package.json
COPY --from=build /repo/apps/tma/next.config.mjs ./apps/tma/next.config.mjs
EXPOSE 3000
WORKDIR /repo/apps/tma
CMD ["npx", "next", "start", "-p", "3000"]

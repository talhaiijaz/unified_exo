# Exo-Platform Frontend Container
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# ----

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]

# Exo-Platform Frontend Container
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
# corepack + pnpm@latest fails on Alpine (ERR_UNKNOWN_BUILTIN_MODULE); match CI pnpm@9
RUN npm install -g pnpm@9
RUN pnpm install --frozen-lockfile

# ----

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=development

RUN npm install -g pnpm@9

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]

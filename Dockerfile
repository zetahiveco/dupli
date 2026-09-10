FROM node:24

WORKDIR /app

ENV CI=true

COPY . /app

RUN npm install -g pnpm@10.32.1

RUN pnpm install

RUN pnpm prisma generate

RUN pnpm run build

RUN pnpm run build:backend
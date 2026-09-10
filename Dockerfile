FROM node:24

WORKDIR /app

ENV CI=true

COPY . /app

RUN npm install -g pnpm

RUN pnpm install

RUN pnpm prisma generate

RUN pnpm run build

RUN pnpm run build:backend
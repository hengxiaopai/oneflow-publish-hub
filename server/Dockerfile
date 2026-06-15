FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
RUN mkdir -p /app/data && chown -R node:node /app

USER node
EXPOSE 4174

CMD ["sh", "-c", "npx prisma db push && npx prisma db seed && node src/index.js"]

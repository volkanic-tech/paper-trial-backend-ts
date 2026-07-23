# Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/paper_trail_db?schema=public" npx prisma generate

RUN npm run build


# Production Stage
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --verbose

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/paper_trail_db?schema=public" npx prisma generate

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && npx prisma db seed && node dist/index.js"]

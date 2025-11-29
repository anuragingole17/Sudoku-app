From node:25-alpine3.21 as builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install --omit=dev



FROM node:25-alpine3.21 as runner


WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules


COPY --from=builder /app ./

ENV NODE_ENV=production

ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]









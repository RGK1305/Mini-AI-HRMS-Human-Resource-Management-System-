FROM node:20-alpine

# Install OpenSSL — required by Prisma on Alpine/musl
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --skip-generate && (npx prisma db seed || true) && npm start"]

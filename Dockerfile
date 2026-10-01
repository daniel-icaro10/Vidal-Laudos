# Imagem para deploy (Render ou qualquer host com Docker).
# Inclui Chromium para gerar o PDF do laudo e fontes métricas-compatíveis com Arial.
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-dejavu-core openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=10000 \
    CHROME_PATH=/usr/bin/chromium \
    APP_URL=http://127.0.0.1:10000 \
    DATABASE_URL=file:/app/data/app.db \
    UPLOAD_DIR=/app/data/uploads

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate && npm run build && chmod +x scripts/start.sh

EXPOSE 10000
CMD ["sh", "scripts/start.sh"]

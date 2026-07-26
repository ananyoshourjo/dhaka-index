FROM mcr.microsoft.com/playwright:v1.61.1-noble

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    DHAKA_INDEX_DATA_DIR=/app/data

WORKDIR /app

COPY package.json package-lock.json ./
COPY admin-portal/package.json ./admin-portal/package.json
RUN npm ci --include=dev

COPY . .
RUN npm run build && npm run admin:build

RUN mkdir -p /app/data && chown -R pwuser:pwuser /app
USER pwuser

EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]

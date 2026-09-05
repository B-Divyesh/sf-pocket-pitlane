FROM node:22-bookworm-slim
WORKDIR /app
ARG BUILD_SHA=dev
COPY realtime/package.json realtime/package-lock.json ./
RUN npm ci --omit=dev
COPY realtime/server.mjs ./server.mjs
EXPOSE 8080
ENV PORT=8080
ENV BUILD_SHA=$BUILD_SHA
CMD ["node", "server.mjs"]

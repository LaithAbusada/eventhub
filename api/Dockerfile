FROM node:24-alpine
WORKDIR /srv

# Copied first, so npm ci only runs again when the dependencies change
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
EXPOSE 4000
CMD ["node", "src/server.js"]

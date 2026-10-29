FROM node:24-alpine



WORKDIR /srv

COPY package.json package-lock.json ./
RUN npm ci --omit=dev



COPY . .
EXPOSE 4000
CMD ["node", "src/server.js"]
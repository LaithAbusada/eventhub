FROM node:24-alpine AS build
WORKDIR /app

# Copied first, so npm ci only runs again when the dependencies change
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

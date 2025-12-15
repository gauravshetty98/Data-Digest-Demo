FROM node:20-alpine AS build
WORKDIR /app


COPY frontend/demo-dashboard/package.json frontend/demo-dashboard/package-lock.json ./
RUN npm ci


COPY frontend/demo-dashboard/ ./
RUN npm run build

FROM nginx:alpine
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf


COPY --from=build /app/dist /usr/share/nginx/html

FROM node:24-alpine AS builder
WORKDIR /app
ENV PATH=/app/node_modules/.bin:$PATH

# Accept git info as build args
ARG GIT_DATE
ARG GIT_HASH

# Convert to environment variables that Vite can access
ENV VITE_GIT_DATE=${GIT_DATE}
ENV VITE_GIT_HASH=${GIT_HASH}

COPY . /app
RUN apk add git openssh
RUN npm i

ENV NODE_ENV=production
RUN npm run build

# production environment
FROM nginx:1.29-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

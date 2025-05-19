FROM node:20-alpine as build

# Add Python and build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
# Modified npm install command to handle dependency conflicts
RUN npm install --legacy-peer-deps --force

COPY . .
RUN npm run build

FROM nginx:alpine as production
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
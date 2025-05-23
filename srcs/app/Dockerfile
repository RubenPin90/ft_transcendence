FROM node:bullseye-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build-frontend

USER node

CMD [ "node", "backend/server.js" ]
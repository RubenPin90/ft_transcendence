FROM node:bullseye-slim

WORKDIR /backend

COPY package*.json ./

RUN npm install

COPY . .

USER node

CMD [ "node", "server/server.js" ]
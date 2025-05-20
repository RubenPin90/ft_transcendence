FROM node:bullseye-slim

WORKDIR /backend

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "server/server.js" ]
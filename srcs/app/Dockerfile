FROM node:bullseye-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build-frontend

RUN npm run start:css

USER node

CMD [ "node", "backend/server.js" ]
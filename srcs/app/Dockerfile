FROM node:bullseye-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build-frontend

RUN chown -R node:node /app

USER node

WORKDIR /app

# Entferne das hier:
# RUN node create_db.js

CMD [ "sh", "-c", "node database/create_db.js && node backend/server.js" ]

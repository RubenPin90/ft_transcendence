FROM node:bullseye-slim

WORKDIR /frontend

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build




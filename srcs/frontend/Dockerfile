FROM node:bullseye-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

RUN echo "Frontend resources after build" && ls -l ./app

CMD [ "npm", "run", "start" ]


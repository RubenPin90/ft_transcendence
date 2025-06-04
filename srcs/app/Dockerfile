FROM node:bullseye-slim

WORKDIR /app

COPY --chown=node:node package*.json ./

COPY --chown=node:node . .

USER node
# RUN chown -R node:node /app

RUN npm install 
RUN npm run build-frontend
RUN npm run rebuild:css
RUN npm run start:css

WORKDIR /app

CMD [ "sh", "-c", "node database/create_db.js && mv db.sqlite database/db.sqlite && node backend/server.js" ]
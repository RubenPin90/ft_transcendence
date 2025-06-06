FROM node:bullseye-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build-frontend

RUN npm run rebuild:css

# RUN chown -R node:node /app

# RUN chown -R node:node /app

# USER node

WORKDIR /app

# Entferne das hier:
# RUN node create_db.js

#seed_example_users.js should be removed bei abgeben

CMD [ "sh", "-c", "node database/create_db.js && mv db.sqlite database/db.sqlite && node database/seed_example_users.js && node backend/server.js" ]

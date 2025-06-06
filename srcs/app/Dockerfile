FROM node:bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install 

COPY . .

RUN npm run build-frontend

RUN npm run rebuild:css

# RUN chown -R node:node /app

# USER node

COPY app_entrypoint.sh /tools/app_entrypoint.sh
RUN chmod +x /tools/app_entrypoint.sh

ENTRYPOINT [ "/tools/app_entrypoint.sh" ]

CMD [ "node", "backend/server.js" ]
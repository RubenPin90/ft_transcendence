FROM node:22.15.0-slim

COPY ./tools ./tools
RUN chmod +x ./tools/*.json
RUN chmod +x ./tools/index.js
WORKDIR /tools
RUN npm install fastify @fastify/jwt dotenv
CMD ["node", "index.js"]
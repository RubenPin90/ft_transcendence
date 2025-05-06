import Fastify from 'fastify'
// import path from 'path'
// import { fileURLToPath } from 'url'
// import fastifyStatic from '@fastify/static'
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';

dotenv.config();

const app = Fastify();

app.register(jwt, { secret: "ruben" });

app.get('/*', async (req, res) => {
  return `<h1>Welcome to the Fastify server!</h1>`;
  // const { username } = req.body;
  // const token = app.jwt.sign({ username });
  // return { token };
});

app.listen({ port: 5000, host: '0.0.0.0' });
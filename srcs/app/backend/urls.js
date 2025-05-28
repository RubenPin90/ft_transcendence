import path, { dirname } from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import fastifyPlugin from 'fastify-plugin';
import * as utils from './utils.js';

import * as views from './views.js';
import * as mimes from './mimes.js';
import * as send from './responses.js';
import * as modules from './modules.js';
import * as user_db from '../database/db_users_functions.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default fastifyPlugin(async function routes(fastify) {
  // --- JS ---
  fastify.get('/js/:file', async (req, reply) => {
    const file = req.params.file;
    if (!file.endsWith('.js')) return reply.callNotFound();
    return mimes.get_js(file, reply.raw);
  });

  // --- CSS ---
  fastify.get('/css/output.css', async (_, reply) => {
    const data = await fs.readFile(path.join(__dirname, '..', 'frontend', 'css', 'output.css'));
    reply.type('text/css').send(data);
  });

  // --- SVG ---
  fastify.get('/public/:file', async (req, reply) => {
    const file = req.params.file;
  
    let mime = null;
    if (file.endsWith('.svg')) {
      mime = 'image/svg+xml';
    } else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
      mime = 'image/jpeg';
    } else {
      return reply.callNotFound();
    }

    const filePath = path.join(process.cwd(), 'public', file);
    try {
      const data = await fs.readFile(filePath);
      reply.type(mime).send(data);
    } catch (err) {
      reply.code(404).send('File not found');
    }
  });
  
  // --- Views ---
  fastify.get('/', (req, reply) => views.home(req, reply));
  fastify.get('/login', (req, reply) => views.login(req, reply));
  fastify.get('/register', (req, reply) => views.register(req, reply));
  fastify.post('/register', (req, reply) => views.register(req, reply));

  fastify.get('/settings', (req, reply) => views.settings(req, reply));
  fastify.get('/settings/*', (req, reply) => views.settings(req, reply));
  fastify.get('/verify_email', (req, reply) => views.verify_email(req, reply));
  fastify.get('/verify_2fa', (req, reply) => views.verify_2fa(req, reply));
  fastify.get('/verify_custom', (req, reply) => views.verify_custom(req, reply));

  fastify.get('/profile', (req, reply) => views.profile(req, reply));
  fastify.get('/logout', (req, reply) => views.logout(req, reply));
  fastify.get('/update_user', (req, reply) => views.update_user(req, reply));
  fastify.post('/update_user', (req, reply) => views.update_user(req, reply));
  fastify.get('/update_settings', (req, reply) => views.update_settings(req, reply));
  fastify.post('/update_settings', (req, reply) => views.update_settings(req, reply));

  fastify.get('/friends', (req, reply) => views.friends(req, reply));
  fastify.post('/add_friends', (req, reply) => views.add_friends(req, reply));
  fastify.post('/accept_friend', (req, reply) => views.accept_friend(req, reply));
  fastify.post('/reject_friend', (req, reply) => views.reject_friend(req, reply));
  fastify.post('/block_friend', (req, reply) => views.block_friend(req, reply));
  fastify.post('/encript_google', (req, reply) => views.home(req, reply));

  fastify.post('/field_login', (req, reply) => views.field_login(req, reply));
  fastify.post('/field_signup', (req, reply) => views.field_signup(req, reply));

  fastify.post('/home', async (request, reply) => {
    try {
      const link = request.body;
      // check if google or github
      // if google {
        const response = await utils.encrypt_google(link);
        const decoded_user = modules.get_jwt(response.token);
        const user_data = await user_db.get_users_value('self', decoded_user.userid);
        var new_response = {"response": response.response, "token": response.token, "lang": response.lang, "name": user_data.username}
        return reply.code(200).send(new_response);
    // } else {
    // }
    } catch (err) {
      console.error('Error:', err);
      return reply.code(500).send({ "response": 'fail' });
    }
  });

  fastify.post("/get_data", async (request, reply) => utils.get_data(request, reply));

  // --- 404 fallback ---
  fastify.setNotFoundHandler((req, reply) => {
    return send.send_error_page('404.html', reply.raw, 404);
  });
});
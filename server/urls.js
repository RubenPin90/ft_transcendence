import path, { dirname } from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import fastifyPlugin from 'fastify-plugin';

import * as views from './views.js';
import * as mimes from './mimes.js';
import * as send from './responses.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default fastifyPlugin(async function routes(fastify) {
  // --- JS ---
  fastify.get('/js/:file', async (req, reply) => {
    const file = req.params.file;
    if (!file.endsWith('.js')) return reply.callNotFound();
    return mimes.get_js('/js/' + file, reply.raw);
  });

  // --- CSS ---
  fastify.get('/css/output.css', async (_, reply) => {
    const data = await fs.readFile(path.join('/home/vboxuser/ft_transcendence/', 'css', 'output.css'));
    reply.type('text/css').send(data);
  });

  // --- SVG ---
  fastify.get('/img/:file', async (req, reply) => {
    const file = req.params.file;
  
    let mime = null;
    if (file.endsWith('.svg')) {
      mime = 'image/svg+xml';
    } else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
      mime = 'image/jpeg';
    } else {
      return reply.callNotFound();
    }
  
    const filePath = path.join(process.cwd(), 'img', file);
    try {
      const data = await fs.readFile(filePath);
      reply.type(mime).send(data);
    } catch (err) {
      reply.code(404).send('File not found');
    }
  });
  
  // --- Views ---
  fastify.get('/', (req, reply) => {
    views.home(req.raw, reply.raw);
  });
  fastify.get('/login', (req, reply) => views.login(req.raw, reply.raw));
  fastify.get('/register', (req, reply) => views.register(req.raw, reply.raw));

  fastify.get('/settings', (req, reply) => views.settings(req.raw, reply.raw));
  fastify.get('/settings/*', (req, reply) => views.settings(req.raw, reply.raw));
  fastify.get('/settings/user_settings', (req, reply) => views.user_settings(req.raw, reply.raw));
  fastify.get('/settings/change_user', (req, reply) => views.user_settings(req.raw, reply.raw));
  fastify.get('/settings/change_login', (req, reply) => views.user_settings(req.raw, reply.raw));
  fastify.get('/settings/change_avatar', (req, reply) => views.user_settings(req.raw, reply.raw));

  fastify.get('/verify_email', (req, reply) => views.verify_email(req.raw, reply.raw));
  fastify.get('/verify_2fa', (req, reply) => views.verify_2fa(req.raw, reply.raw));
  fastify.get('/verify_custom', (req, reply) => views.verify_custom(req.raw, reply.raw));

  fastify.get('/profile', (req, reply) => views.profile(req.raw, reply.raw));
  fastify.get('/logout', (req, reply) => views.logout(req.raw, reply.raw));
  fastify.get('/update_user', (req, reply) => views.update_user(req.raw, reply.raw));
  fastify.get('/update_settings', (req, reply) => views.update_settings(req.raw, reply.raw));

  // --- 404 fallback ---
  fastify.setNotFoundHandler((req, reply) => {
    return send.send_error_page('404.html', reply.raw, 404);
  });
});
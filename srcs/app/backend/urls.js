import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import fastifyPlugin from 'fastify-plugin';
import * as utils from './utils.js';
import * as views from './views.js';
import * as mimes from './mimes.js';
import * as send from './responses.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default fastifyPlugin(async function routes(fastify) {
  fastify.get('/js/:file', async (req, reply) => {
    const file = req.params.file;
    if (!file.endsWith('.js')) return reply.callNotFound();
    return mimes.get_js(file, reply);
  });

  fastify.get('/css/output.css', async (_, reply) => {
    const data = await fs.readFile(path.join(__dirname, '..', 'frontend', 'css', 'output.css'));
    reply.type('text/css').send(data);
  });

  fastify.get('/public/:file', async (req, reply) => {
    const file = req.params.file;
    
    let mime = null;
    if (file.endsWith('.svg')) {
      mime = 'image/svg+xml';
    } else {
      reply.code(404).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": 'SVG not found'});
      return reply.callNotFound();
    }
    
    const filePath = path.join(process.cwd(),'frontend' ,'public', file);
    try {
      const data = await fs.readFile(filePath);
      reply.type(mime).send(data);
    } catch (err) {
      reply.code(404).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": 'File not found'});
      return reply.callNotFound();
    }
  });
  
  fastify.get('/', (req, reply) => views.home(req, reply));
  fastify.get('/login', (req, reply) => views.login(req, reply));
  fastify.post('/login', (req, reply) => views.login(req, reply));
  fastify.get('/register', (req, reply) => views.register(req, reply));
  fastify.post('/register', (req, reply) => views.register(req, reply));

  

  fastify.get('/settings', (req, reply) => views.settings(req, reply));
  fastify.post('/settings', (req, reply) => views.settings(req, reply));
  fastify.get('/settings/*', (req, reply) => views.settings(req, reply));
  fastify.post('/settings/*', (req, reply) => views.settings(req, reply));

  fastify.get('/profile', (req, reply) => views.profile(req, reply));
  fastify.post('/profile', (req, reply) => views.profile(req, reply));
  fastify.post('/logout', (req, reply) => views.logout(req, reply));
  fastify.post('/update_user', (req, reply) => views.update_user(req, reply));
  fastify.post('/update_settings', (req, reply) => views.update_settings(req, reply));

  fastify.get('/friends', (req, reply) => views.friends(req, reply));
  fastify.post('/friends', (req, reply) => views.friends(req, reply));
  fastify.post('/add_friends', (req, reply) => views.add_friends(req, reply));
  fastify.post('/accept_friends', (req, reply) => views.accept_friends(req, reply));
  fastify.post('/reject_friend', (req, reply) => views.reject_friend(req, reply));

  fastify.get('/play', (req, reply) => views.play(req, reply));

  fastify.post('/delete_account', (req, reply) => views.delete_account(req, reply));
  fastify.post('/mfa_setup', (req, reply) => views.set_up_mfa_buttons(req, reply));
  fastify.post('/mfa', (req, reply) => views.mfa(req, reply));
  fastify.post('/get_data', (req, reply) => utils.get_data(req, reply));
  fastify.post("/check_preferred_mfa", async (request, reply) => views.check_preferred_mfa(request, reply));

  fastify.post("/change_preferred_mfa", (req, reply) => views.change_preferred_mfa(req, reply));

  fastify.post("/check_expire", (request, reply) => utils.check_expired_token(request, reply));
  fastify.get('/game/*', (req, reply) => views.play(req, reply));
  fastify.get('/matchmaking', (req, reply) => views.play(req, reply));
  fastify.get('/matchmaking*', (req, reply) => views.play(req, reply));
  fastify.get('/matchmaking/*', (req, reply) => views.play(req, reply));
  fastify.get('/tournament*', (req, reply) => views.play(req, reply));
  fastify.setNotFoundHandler((req, reply) => {
    return send.send_error_page('404.html', reply, 404);
  });
});
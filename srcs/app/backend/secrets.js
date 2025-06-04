import { promises as fs } from 'fs';

export async function read_secrets(fastify) {
    const arr = Object.entries(process.env);
    const envKey = arr.map(e => e[0]);
    const filePath = arr.map(e => e[1]);

    for (let i = 0; i < envKey.length; i++) {
        console.log(envKey[i]);
        if (envKey[i].endsWith('_FILE')) {
            const env_name = envKey[i].substring(0, envKey[i].indexOf('_FILE')).toLowerCase();
            try {
                const sec_path = (await fs.readFile(filePath[i], 'utf8')).trim();
                fastify.decorate(env_name, sec_path);
            } catch(err) {
                console.error(`Secret was empty ${envKey}`);
                fastify.decorate(env_name, null);
            }
        }
    }
}
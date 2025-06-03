import fetch from 'node-fetch';

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
const URL = 'https://localhost/register';

const users = [
  { username: 'alice',   email: 'alice@example.com',  password: '1234' },
  { username: 'bob',     email: 'bob@example.com',    password: '1234' },
  { username: 'char',    email: 'char@example.com',   password: '1234' },
  { username: 'david',   email: 'david@example.com',  password: '1234' },
];

async function registerUser(user) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });

    const json = await res.json();
    console.log(`Registering ${user.username}:`, json.Response);
  } catch (err) {
    console.error(`Error registering ${user.username}:`, err.message);
  }
}

for (const user of users) {
  await registerUser(user);
}

import fetch from 'node-fetch';

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
const URL = 'https://localhost/register';

const users = [
  { username: 'alice', email: 'a@a.a', password: '1234' },
  { username: 'bob', email: 's@s.s', password: '1234' },
  { username: 'char', email: 'char@example.com', password: '1234' },
  { username: 'david', email: 'david@example.com', password: '1234' },
];

async function registerUser(user) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });

    const contentType = res.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const json = await res.json();
      console.log(`Registering ${user.username}:`, json.Response ?? json);
    } else {
      const text = await res.text();
      console.error(`Server returned non-JSON response for ${user.username}:`);
      console.error(text);
    }
  } catch (err) {
    console.error(`Error registering ${user.username}:`, err.message);
  }
}

(async () => {
  for (const user of users) {
    await registerUser(user);
  }
})();

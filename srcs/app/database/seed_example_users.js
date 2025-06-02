import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

export async function seedExampleUsers() {
  const db = await open({
    filename: 'db.sqlite',
    driver: sqlite3.Database
  });

  try {
    await db.exec('BEGIN'); // start transaction

    const demoUsers = [
      { role_id: 1, username: 'alice',   self: 'alice@example.com'   },
      { role_id: 2, username: 'bob',     self: 'bob@example.com'     },
      { role_id: 1, username: 'charlie', self: 'charlie@example.com' },
      { role_id: 3, username: 'david',   self: 'david@example.com'   }
    ];

    for (const u of demoUsers) {
      // Insert a minimal settings row with password = "1234"
      await db.run(
        `INSERT OR IGNORE INTO settings (self, password) VALUES (?, ?);`,
        [u.self, '1234']
      );

      // Now insert into users
      await db.run(
        `INSERT OR IGNORE INTO users (role_id, username, self)
         VALUES (?, ?, ?);`,
        [u.role_id, u.username, u.self]
      );
    }

    await db.exec('COMMIT');
    console.log('✔ 4 demo users (with password=1234) inserted (or already present)');
    return 0;
  } catch (err) {
    await db.exec('ROLLBACK');
    console.error('❌ Error seeding demo users:', err);
    return -1;
  } finally {
    await db.close();
  }
}

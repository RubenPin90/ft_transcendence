import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function _db () {
  return open({ filename: './database/db.sqlite', driver: sqlite3.Database });
}

export async function get_matches () {
  const db = await _db();
  try {
    return await db.all('SELECT * FROM match');
  } finally {
    await db.close();
  }
}

export async function get_match_by (field, value) {
  const cols = ['points', 'player1', 'player2', 'winner'];
  if (!cols.includes(field)) return null;

  const db = await _db();
  try {
    const sql = `SELECT * FROM match WHERE ${field} = ?`;
    return await db.get(sql, [value]);
  } finally {
    await db.close();
  }
}

export async function create_match (points, player1, player2, match_id, tournament_id = null) {
  const db = await _db();
  try {
    const p1 = await db.get('SELECT 1 FROM users WHERE self = ?', [player1]);
    const p2 = await db.get('SELECT 1 FROM users WHERE self = ?', [player2]);
    if (!p1 || !p2) return -1;

    const dup = await db.get('SELECT 1 FROM match WHERE match_id = ?', [match_id]);
    if (dup) return -2;

    return await db.run(
      `INSERT INTO match (points, player1, player2, match_id, tournament_id)
       VALUES (?,?,?,?,?)`,
      [points, player1, player2, match_id, tournament_id]
    );
  } finally {
    await db.close();
  }
}

export async function update_match(field, value, match_id) {
  const cols = ['points', 'player1', 'player2', 'winner'];
  if (!cols.includes(field)) return null;

  const db = await _db();
  try {
    const sql = `UPDATE match SET ${field} = ? WHERE match_id = ?`;
    return await db.run(sql, [value, match_id]);
  } finally {
    await db.close();
  }
}

export async function delete_match (match_id) {
  const db = await _db();
  try {
    return await db.run('DELETE FROM match WHERE match_id = ?', [match_id]);
  } finally {
    await db.close();
  }
}

export async function show_matches() {
  const db = await _db();
  try {
    return await db.all(`
      SELECT *
        FROM match
      ORDER BY match_id`);
  } finally {
    await db.close();
  }
}
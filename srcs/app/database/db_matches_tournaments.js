import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function _db () {
  return open({ filename: 'db.sqlite', driver: sqlite3.Database });
}

/* ────────────────────────── match (matches) ────────────────────────── */

export async function get_matches () {
  const db = await _db();
  try {
    return await db.all('SELECT * FROM match');
  } finally {
    await db.close();
  }
}

export async function get_match_by (field, value) {
  const cols = ['id', 'match_id', 'player1', 'player2'];
  if (!cols.includes(field)) return null;

  const db = await _db();
  try {
    const sql = `SELECT * FROM match WHERE ${field} = ?`;
    return await db.get(sql, [value]);
  } finally {
    await db.close();
  }
}

export async function create_match (points, player1, player2, match_id) {
  const db = await _db();
  try {
    /* checks */
    const p1 = await db.get('SELECT 1 FROM settings WHERE self = ?', [player1]);
    const p2 = await db.get('SELECT 1 FROM settings WHERE self = ?', [player2]);
    if (!p1 || !p2) return -1;

    const dup = await db.get('SELECT 1 FROM match WHERE match_id = ?', [match_id]);
    if (dup) return -2;

    /* insert */
    return await db.run(
      `INSERT INTO match (points, player1, player2, match_id)
       VALUES (?,?,?,?)`,
      [points, player1, player2, match_id]
    );
  } finally {
    await db.close();
  }
}

export async function update_match (field, value, match_id) {
  const cols = ['points', 'player1', 'player2'];
  if (!cols.includes(field)) return null;

  const db = await _db();
  try {
    const sql = `UPDATE match SET ${field} = ? WHERE match_id = ?`;
    return await db.run(sql, [value, match_id]);
  } finally {
    await db.close();
  }
}

/**
 * DELETE a match by match_id
 */
export async function delete_match (match_id) {
  const db = await _db();
  try {
    return await db.run('DELETE FROM match WHERE match_id = ?', [match_id]);
  } finally {
    await db.close();
  }
}

/* ────────────────────────── tournament ────────────────────────── */

/**
 * Get every row of every tournament, or just one tournament if id provided.
 */
export async function get_tourney_rows (tournament_id = null) {
  const db = await _db();
  try {
    if (tournament_id)
      return await db.all(
        'SELECT * FROM tournament WHERE tournament_id = ?',
        [tournament_id]
      );
    return await db.all('SELECT * FROM tournament');
  } finally {
    await db.close();
  }
}

export async function create_tourney_row (tournament_id, round, match_id) {
  const db = await _db();
  try {
    const match = await db.get(
      'SELECT 1 FROM match WHERE match_id = ?',
      [match_id]
    );
    if (!match) return -1;

    return await db.run(
      `INSERT INTO tournament (tournament_id, round, match_id)
       VALUES (?,?,?)`,
      [tournament_id, round, match_id]
    );
  } finally {
    await db.close();
  }
}

export async function set_tourney_winner (tournament_id, round, winner) {
  const db = await _db();
  try {
    const ok = await db.get('SELECT 1 FROM settings WHERE self = ?', [winner]);
    if (!ok) return -1;

    return await db.run(
      `UPDATE tournament
         SET winner = ?
       WHERE tournament_id = ? AND round = ?`,
      [winner, tournament_id, round]
    );
  } finally {
    await db.close();
  }
}

export async function delete_tourney (tournament_id) {
  const db = await _db();
  try {
    return await db.run(
      'DELETE FROM tournament WHERE tournament_id = ?',
      [tournament_id]
    );
  } finally {
    await db.close();
  }
}

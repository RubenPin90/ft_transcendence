import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function get_matches () {
  const db = await open({
      filename: './database/db.sqlite',
      driver: sqlite3.Database
  });

  try {
    return await db.all('SELECT * FROM match');
  } finally {
    await db.close();
  }
}

async function get_match_by (field, value) {
  const cols = ['points', 'player1', 'player2', 'winner'];
  if (!cols.includes(field))
    return null;
  const db = await open({
    filename: './database/db.sqlite',
    driver: sqlite3.Database
  });

  try {
    const sql = `SELECT * FROM match WHERE ${field} = ?`;
    return await db.get(sql, [value]);
  } finally {
    await db.close();
  }
}

async function create_match (points, player1, player2, match_id, tournament_id = null) {
  const db = await open({
    filename: './database/db.sqlite',
    driver: sqlite3.Database
  });

  try {
    const p1 = await db.get(`
      SELECT 1 FROM users WHERE self = ?`, [player1]);
    const p2 = await db.get(`
      SELECT 1 FROM users WHERE self = ?`, [player2]);
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

async function update_match(field, value, match_id) {
  const cols = ['points', 'player1', 'player2', 'winner'];
  if (!cols.includes(field))
    return null;

  const db = await open({
    filename: './database/db.sqlite',
    driver: sqlite3.Database
  });

  try {
    const sql = `UPDATE match SET ${field} = ? WHERE match_id = ?`;
    return await db.run(sql, [value, match_id]);
  } finally {
    await db.close();
  }
}

async function delete_match (match_id) {
  const db = await open({
    filename: './database/db.sqlite',
    driver: sqlite3.Database
  });
  try {
    return await db.run('DELETE FROM match WHERE match_id = ?', [match_id]);
  } finally {
    await db.close();
  }
}

async function show_matches() {
  const db = await open({
    filename: './database/db.sqlite',
    driver: sqlite3.Database
  });
  try {
    return await db.all(`
      SELECT *
        FROM match
      ORDER BY match_id`);
  } finally {
    await db.close();
  }
}

async function get_lost(userid){
  const db = await open({
    filename: './database/db.sqlite',
    driver: sqlite3.Database
  });

  var loss = 0;
  try{
    const row = await db.all(`
        SELECT * FROM match WHERE (player1 = ? OR player2 = ?) AND winner != ?`, [userid, userid, userid]);
    for (var losses of row){
      loss++;
    }
    return loss;
  } catch(err) {
    console.error(`error in get_won match_db: ${err}`);
  }
  finally{
    await db.close();
  }
}

async function get_won(userid){
  const db = await open({
    filename: './database/db.sqlite',
    driver: sqlite3.Database
  });

  var wins = 0;
  try{
    const row = await db.all(`
        SELECT * FROM match WHERE winner = ?`, [userid]);
    for (var winns of row){
      wins++;
    }
    return wins;
  } catch(err) {
    console.error(`error in get_won match_db: ${err}`);
  }
  finally{
    await db.close();
  }
}

async function get_played_matches(userid){
  const db = await open({
    filename: './database/db.sqlite',
    driver: sqlite3.Database
  });

  var index_html = `
  <thead>
      <tr class="">
          <th>opponent</th>
          <th>final score</th>
          <th>date</th>
      </tr>
  </thead>`;

  try{
    var i = 0;
    const rows = await db.all(`
      SELECT * FROM match
      WHERE (player1 = ? OR player2 = ?)`, [userid, userid]);
    for (var single of rows){
      var enemy;
      if (single.player1 == userid){
        enemy = single.player2;
      } else {
        enemy = single.player1;
      }
      var enemy_db = await db.get(`SELECT * FROM users WHERE self = ?`, [enemy]);
      if (Object.values(JSON.parse(single.points)).length != 2){
        if (single.winner == enemy){
          index_html += `
          <tr class="bg-red-200">
            <td>${enemy_db.username}</td>
            <td>Forfeit</td>
            <td>${single.date}</td>
          </tr>
          `;
        } else {
          index_html += `
          <tr class="bg-green-200">
            <td>${enemy_db.username}</td>
            <td>Enemy Left the match</td>
            <td>${single.date}</td>
          </tr>
          `;
        }
      }else{
        if (single.winner == enemy){
          index_html += `
          <tr class="bg-red-200">
            <td>${enemy_db.username}</td>
            <td>${Object.values(JSON.parse(single.points)).join(' / ')}</td>
            <td>${single.date}</td>
          </tr>
          `;
        } else {
          index_html += `
          <tr class="bg-green-200">
            <td>${enemy_db.username}</td>
            <td>${Object.values(JSON.parse(single.points)).join(' / ')}</td>
            <td>${single.date}</td>
          </tr>
          `;
        }
      }
      i++;
    }
    if (i == 0){
      index_html = `<span>No matches in hisory play some games and they will show up here</span>`
    }
    return index_html;
  } catch(err) {
    console.error(`error in get_played_matches match_db: ${err}`);
  }
  finally{
    await db.close();
  }
}

export{
  get_matches,
  get_match_by,
  create_match,
  update_match,
  delete_match,
  show_matches,
  get_lost,
  get_won,
  get_played_matches,
}
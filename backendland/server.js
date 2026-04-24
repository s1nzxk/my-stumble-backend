const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

const app = express();
app.use(cors());
app.use(express.json());

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    const empty = { users: [], bans: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.get('/config.json', (req, res) => {
  res.json({ name: "MyStumbleMod", version: "1.0.0", maintenance: false });
});

app.post('/user/login/', (req, res) => {
  try {
    const { deviceId, country } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    const db = readDb();
    let user = db.users.find(u => u.deviceId === deviceId);

    if (!user) {
      user = {
        id: Math.floor(Math.random() * 999999),
        deviceId,
        country: country || 'US',
        username: 'Player_' + deviceId.slice(0, 6),
        crowns: 0,
        gems: 9999,
        trophys: 0,
        coins: 9999,
        banned: false
      };
      db.users.push(user);
      writeDb(db);
      console.log('[Server] New user: ' + user.username);
    }

    if (db.bans.includes(user.username) || user.banned) {
      return res.json({ banned: true, username: user.username });
    }

    return res.json({
      authorized: true,
      banned: false,
      username: user.username,
      crowns: user.crowns,
      gems: user.gems,
      coins: user.coins,
      trophys: user.trophys,
      id: user.id,
      balances: [
        { name: 'gems', amount: user.gems },
        { name: 'coins', amount: user.coins }
      ]
    });
  } catch (err) {
    console.error('[Server] Error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/admin/ban', (req, res) => {
  const { username, action } = req.body || {};
  if (!username || !action) return res.status(400).json({ error: 'missing fields' });
  const db = readDb();
  if (action === 'ban') {
    if (!db.bans.includes(username)) db.bans.push(username);
    const u = db.users.find(x => x.username === username);
    if (u) u.banned = true;
  } else if (action === 'unban') {
    db.bans = db.bans.filter(b => b !== username);
    const u = db.users.find(x => x.username === username);
    if (u) u.banned = false;
  }
  writeDb(db);
  return res.json({ ok: true });
});

app.get('/admin/users', (req, res) => {
  const db = readDb();
  res.json(db.users);
});

app.listen(PORT, () => {
  console.log('[Server] Running on port ' + PORT);
});

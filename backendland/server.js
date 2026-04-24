// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { nanoid } = require('nanoid');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Inicializa lowdb
const adapter = new JSONFile(DB_FILE);
const db = new Low(adapter);

async function initDb() {
  await db.read();
  db.data = db.data || { config: {}, users: [], bans: [] };

  // Valores padrão (só são aplicados se estiver vazio)
  db.data.config = db.data.config || {
    name: "BackendLand",
    version: "1.0.0",
    message: "Backend de teste para mod",
    maintenance: false
  };

  // garante estrutura
  db.data.users = db.data.users || [];
  db.data.bans = db.data.bans || [];

  await db.write();
}

// Utilitários
async function findUserByDevice(deviceId) {
  await db.read();
  return db.data.users.find(u => u.deviceId === deviceId);
}

async function isBanned(username) {
  await db.read();
  if (!username) return false;
  return db.data.bans.some(b => b.toLowerCase() === username.toLowerCase());
}

// Endpoints

// Config estático (GET /config.json)
app.get('/config.json', async (req, res) => {
  await db.read();
  res.json(db.data.config);
});

// Endpoint de login que o mod espera (POST /user/login/)
app.post('/user/login/', async (req, res) => {
  try {
    await db.read();
    const { deviceId, country, hash } = req.body || {};

    // validações básicas
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId required' });
    }

    // ---------- Autenticação simples ----------
    const acceptedHash = process.env.SERVER_HASH || 'VinAW5ATPxIZS3fe9OEqirN35SyOil4zMTgiHFAOfKkkamiTV0EqKjXibc9ZydTHAsSVBMWww71bnGieEDfB1jBT3xf9JnWZAr9W5cvDj2IUtBk0yOUEh0nMGsLiF8G7';

    // Busca usuário por deviceId
    let user = db.data.users.find(u => u.deviceId === deviceId);

    if (!user) {
      // cria novo usuário default
      user = {
        id: nanoid(),
        deviceId,
        country: country || 'BR',
        username: `Player_${deviceId.slice(0,6)}`,
        crowns: 0,
        gems: 0,
        // NOTE: mod espera "trophys" (erro de ortografia comum) — manter chave
        trophys: 0,
        skillRating: 0,
        balances: [
          { name: 'gems', amount: 0 },
          { name: 'coins', amount: 0 }
        ],
        banned: false,
        createdAt: new Date().toISOString()
      };
      db.data.users.push(user);
      await db.write();
      console.log(`[Backend] Novo usuário criado: ${user.username} (${user.deviceId})`);
    }

    // checagem de ban local
    if (await isBanned(user.username) || user.banned) {
      console.log(`[Backend] Login rejeitado: usuário banido => ${user.username}`);
      return res.json({
        authorized: false,
        banned: true,
        message: 'User is banned',
        username: user.username
      });
    }

    // forma de retorno compatível com o mod
    const responsePayload = {
      authorized: hash === acceptedHash,
      banned: false,
      username: user.username,
      crowns: user.crowns,
      gems: user.gems,
      coins: user.balances.find(b => b.name === 'coins')?.amount || 0,
      trophys: user.trophys,
      skillRating: user.skillRating,
      balances: user.balances,
      message: hash === acceptedHash ? 'Authorized' : 'UnauthorizedHash'
    };

    console.log(`[Backend] Login request: device=${deviceId}, username=${user.username}, authorized=${responsePayload.authorized}`);
    return res.json(responsePayload);
  } catch (err) {
    console.error('[Backend] Erro em /user/login/:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Endpoint admin para ban (POST /admin/ban) - simples e inseguro, só pra dev/test
// body: { username: "nome", action: "ban" | "unban" }
app.post('/admin/ban', async (req, res) => {
  try {
    await db.read();
    const { username, action } = req.body || {};
    if (!username || !action) return res.status(400).json({ error: 'username and action required' });

    if (action === 'ban') {
      if (!db.data.bans.includes(username)) db.data.bans.push(username);
      const u = db.data.users.find(x => x.username === username);
      if (u) u.banned = true;
      await db.write();
      console.log(`[Backend] Usuario banido: ${username}`);
      return res.json({ ok: true, banned: true });
    } else if (action === 'unban') {
      db.data.bans = db.data.bans.filter(b => b.toLowerCase() !== username.toLowerCase());
      const u = db.data.users.find(x => x.username === username);
      if (u) u.banned = false;
      await db.write();
      console.log(`[Backend] Usuario desbanido: ${username}`);
      return res.json({ ok: true, banned: false });
    } else {
      return res.status(400).json({ error: 'unknown action' });
    }
  } catch (err) {
    console.error('[Backend] Erro em /admin/ban:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Endpoint para ver users (GET /admin/users) - só pra debug
app.get('/admin/users', async (req, res) => {
  await db.read();
  res.json(db.data.users);
});

app.listen(PORT, async () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ config: {}, users: [], bans: [] }, null, 2));
  }
  await initDb();
  console.log(`[Backend] BackendLand iniciado na porta ${PORT}`);
  console.log(`[Backend] GET /config.json  POST /user/login/  POST /admin/ban`);
});

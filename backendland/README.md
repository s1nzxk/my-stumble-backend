# BackendLand (demo)

Backend simples em Node.js/Express com lowdb para testes de mod.

## Endpoints
- `GET /config.json` -> retorna config.
- `POST /user/login/` -> body JSON: `{ deviceId, country, hash }` - retorna JSON do usuário.
- `POST /admin/ban` -> body JSON: `{ username, action }` onde `action` é `ban` ou `unban`.
- `GET /admin/users` -> lista users (apenas debug).

## Instalação
```bash
git clone <repo>
cd backendland
npm install
npm start
```

## Variáveis de ambiente
- `PORT` (opcional)
- `SERVER_HASH` (se quiser exigir hash específico)

## Observações
- Este backend é **para desenvolvimento/testes**. Não use em produção sem ajustes de segurança (autenticação, TLS, autorização).
- O arquivo `db.json` persiste dados localmente.

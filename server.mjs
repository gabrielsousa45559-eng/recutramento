import http from 'node:http';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
const usersFile = path.join(dataDir, 'users.json');
const sessions = new Map();
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml' };
await mkdir(dataDir, { recursive: true });
if (!existsSync(usersFile)) await writeFile(usersFile, '[]', { flag: 'wx' });
const readUsers = async () => JSON.parse(await readFile(usersFile, 'utf8'));
const saveUsers = async users => writeFile(usersFile, JSON.stringify(users, null, 2));
const hash = (password, salt = randomBytes(16).toString('hex')) => ({ salt, hash: scryptSync(password, salt, 64).toString('hex') });
const verify = (password, account) => timingSafeEqual(Buffer.from(hash(password, account.salt).hash, 'hex'), Buffer.from(account.hash, 'hex'));
const cookie = req => Object.fromEntries((req.headers.cookie || '').split(';').map(x => x.trim().split('=').map(decodeURIComponent))).sid;
const json = (res, code, data, extra = {}) => { res.writeHead(code, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', ...extra }); res.end(JSON.stringify(data)); };
async function body(req) { let raw=''; for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw Error('Payload muito grande'); } return raw ? JSON.parse(raw) : {}; }
const clean = ({ id, name, username, role, createdAt }) => ({ id, name, username, role, createdAt });

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      const users = await readUsers();
      if (req.method === 'GET' && url.pathname === '/api/setup-status') return json(res, 200, { needsSetup: users.length === 0 });
      if (req.method === 'POST' && url.pathname === '/api/setup') {
        if (users.length) return json(res, 409, { error: 'A configuração inicial já foi concluída.' });
        const input = await body(req);
        if (!Array.isArray(input.developers) || input.developers.length !== 2) return json(res, 400, { error: 'Cadastre exatamente os dois desenvolvedores.' });
        const names = new Set();
        for (const d of input.developers) {
          if (!/^[\p{L}\p{N}_.-]{3,32}$/u.test(d.username || '') || (d.password || '').length < 10 || !(d.name || '').trim()) return json(res, 400, { error: 'Informe nome, usuário válido e senha com pelo menos 10 caracteres.' });
          if (names.has(d.username.toLowerCase())) return json(res, 400, { error: 'Os nomes de usuário devem ser diferentes.' });
          names.add(d.username.toLowerCase());
        }
        const created = input.developers.map(d => ({ id: randomBytes(12).toString('hex'), name: d.name.trim(), username: d.username.trim(), role: 'desenvolvedor', createdAt: new Date().toISOString(), ...hash(d.password) }));
        await saveUsers(created);
        return json(res, 201, { ok: true });
      }
      if (req.method === 'POST' && url.pathname === '/api/login') {
        const input = await body(req); const account = users.find(u => u.username.toLowerCase() === (input.username || '').trim().toLowerCase());
        if (!account || !verify(input.password || '', account)) return json(res, 401, { error: 'Usuário ou senha incorretos.' });
        const sid = randomBytes(32).toString('hex'); sessions.set(sid, account.id);
        return json(res, 200, { user: clean(account) }, { 'Set-Cookie':`sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800` });
      }
      const sid = cookie(req); const account = users.find(u => u.id === sessions.get(sid));
      if (req.method === 'POST' && url.pathname === '/api/logout') { sessions.delete(sid); return json(res, 200, { ok:true }, { 'Set-Cookie':'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' }); }
      if (req.method === 'GET' && url.pathname === '/api/me') return account ? json(res, 200, { user:clean(account) }) : json(res, 401, { error:'Sessão encerrada.' });
      if (!account) return json(res, 401, { error:'Faça login para continuar.' });
      if (req.method === 'GET' && url.pathname === '/api/users') {
        if (account.role !== 'desenvolvedor' && account.role !== 'administração') return json(res, 403, { error:'Sem permissão.' });
        return json(res, 200, { users: users.map(clean) });
      }
      if (req.method === 'POST' && url.pathname === '/api/users') {
        if (account.role !== 'desenvolvedor' && account.role !== 'administração') return json(res, 403, { error:'Sem permissão.' });
        const input = await body(req); const username = (input.username || '').trim();
        if (!/^[\p{L}\p{N}_.-]{3,32}$/u.test(username) || (input.password || '').length < 10 || !(input.name || '').trim() || !['membro','gestão','administração'].includes(input.role)) return json(res, 400, { error:'Confira nome, usuário, nível e senha (mínimo 10 caracteres).' });
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) return json(res, 409, { error:'Esse usuário já existe.' });
        const user = { id:randomBytes(12).toString('hex'), name:input.name.trim(), username, role:input.role, createdAt:new Date().toISOString(), ...hash(input.password) };
        users.push(user); await saveUsers(users); return json(res, 201, { user:clean(user) });
      }
      return json(res, 404, { error:'Rota não encontrada.' });
    }
    const requested = url.pathname === '/' ? '/index.html' : url.pathname;
    const target = path.resolve(root, 'public', `.${requested}`);
    if (!target.startsWith(path.resolve(root, 'public') + path.sep)) return json(res,404,{error:'Não encontrado.'});
    const file = await readFile(target);
    res.writeHead(200, { 'Content-Type':mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY', 'Referrer-Policy':'same-origin' }); res.end(file);
  } catch (error) { json(res, 500, { error:'Não foi possível concluir a operação.' }); console.error(error.message); }
});

const port = Number(process.env.PORT || 4173);
server.listen(port, '127.0.0.1', () => console.log(`Painel disponível em http://localhost:${port}`));

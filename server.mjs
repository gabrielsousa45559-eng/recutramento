import http from 'node:http';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
const usersFile = path.join(dataDir, 'users.json');
const dataFiles = { recruitments:'recruitments.json', goals:'goals.json', events:'events.json', settings:'settings.json' };
const sessions = new Map();
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml' };
await mkdir(dataDir, { recursive: true });
if (!existsSync(usersFile)) await writeFile(usersFile, '[]', { flag: 'wx' });
for (const [name, file] of Object.entries(dataFiles)) if (!existsSync(path.join(dataDir, file))) await writeFile(path.join(dataDir, file), name === 'settings' ? '{}' : '[]', { flag:'wx' });
const readUsers = async () => JSON.parse(await readFile(usersFile, 'utf8'));
const saveUsers = async users => writeFile(usersFile, JSON.stringify(users, null, 2));
const readData = async name => JSON.parse(await readFile(path.join(dataDir, dataFiles[name]), 'utf8'));
const saveData = async (name, data) => writeFile(path.join(dataDir, dataFiles[name]), JSON.stringify(data, null, 2));
const nameKey = name => (name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const usernameFromName = name => nameKey(name).replace(/[^a-z0-9_.-]/g, '');
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
        if (!Array.isArray(input.developers) || input.developers.length !== 1) return json(res, 400, { error: 'Cadastre uma conta de desenvolvedor.' });
        const names = new Set();
        for (const d of input.developers) {
          const key = nameKey(d.name);
          if (!key || usernameFromName(d.name).length < 3 || (d.password || '').length < 8) return json(res, 400, { error: 'Informe um nome válido e uma senha com pelo menos 8 caracteres.' });
          if (names.has(key)) return json(res, 400, { error: 'Os nomes devem ser diferentes.' });
          names.add(key);
        }
        const created = input.developers.map(d => ({ id: randomBytes(12).toString('hex'), name: d.name.trim(), username: usernameFromName(d.name), role: 'desenvolvedor', createdAt: new Date().toISOString(), ...hash(d.password) }));
        await saveUsers(created);
        return json(res, 201, { ok: true });
      }
      if (req.method === 'POST' && url.pathname === '/api/login') {
        const input = await body(req); const account = users.find(u => nameKey(u.name) === nameKey(input.name));
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
        const input = await body(req); const username = usernameFromName(input.name);
        if (username.length < 3 || username.length > 32 || (input.password || '').length < 8 || !(input.name || '').trim() || !['membro','gestão','administração'].includes(input.role)) return json(res, 400, { error:'Confira nome, nível e senha (mínimo 8 caracteres).' });
        if (users.some(u => nameKey(u.name) === nameKey(input.name))) return json(res, 409, { error:'Já existe uma pessoa com esse nome.' });
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) return json(res, 409, { error:'Esse usuário já existe.' });
        const user = { id:randomBytes(12).toString('hex'), name:input.name.trim(), username, role:input.role, createdAt:new Date().toISOString(), ...hash(input.password) };
        users.push(user); await saveUsers(users); return json(res, 201, { user:clean(user) });
      }
      if (req.method === 'GET' && url.pathname === '/api/recruitments') {
        const items = await readData('recruitments');
        return json(res, 200, { items:account.role === 'membro' ? items.filter(x => x.creatorId === account.id) : items });
      }
      if (req.method === 'POST' && url.pathname === '/api/recruitments') {
        const input = await body(req);
        if (!(input.candidateName || '').trim() || !(input.passport || '').trim()) return json(res, 400, { error:'Informe nome e passaporte/ID.' });
        const items = await readData('recruitments');
        const item = { id:randomBytes(12).toString('hex'), candidateName:input.candidateName.trim(), passport:input.passport.trim(), discord:(input.discord || '').trim(), phone:(input.phone || '').trim(), playTime:(input.playTime || '').trim(), referredBy:(input.referredBy || '').trim(), observations:(input.observations || '').trim(), interview:input.interview || {}, status:'Em análise', creatorId:account.id, recruiter:account.name, createdAt:new Date().toISOString() };
        items.unshift(item); await saveData('recruitments', items); return json(res, 201, { item });
      }
      const statusMatch = url.pathname.match(/^\/api\/recruitments\/([^/]+)\/status$/);
      if (req.method === 'PATCH' && statusMatch) {
        if (account.role === 'membro') return json(res, 403, { error:'Somente Gestão e Administração podem alterar status.' });
        const { status } = await body(req); const statuses = ['Em análise','Entrevista agendada','Aguardando setagem','Setado / Em instrução','Recruta em avaliação','Aguardando efetivação','Aprovado / Efetivado','Reprovado','Desligado'];
        if (!statuses.includes(status)) return json(res, 400, { error:'Status inválido.' });
        const items = await readData('recruitments'); const item = items.find(x => x.id === decodeURIComponent(statusMatch[1]));
        if (!item) return json(res, 404, { error:'Candidato não encontrado.' });
        item.status = status; item.updatedAt = new Date().toISOString(); item.updatedBy = account.name; await saveData('recruitments', items); return json(res, 200, { item });
      }
      if (req.method === 'GET' && url.pathname === '/api/goals') return json(res, 200, { items:await readData('goals') });
      if (req.method === 'POST' && url.pathname === '/api/goals') {
        if (!['desenvolvedor','administração'].includes(account.role)) return json(res, 403, { error:'Somente Administração pode configurar metas.' });
        const input = await body(req); if (!(input.name || '').trim() || Number(input.target) < 1) return json(res, 400, { error:'Informe a meta e um valor maior que zero.' });
        const items = await readData('goals'); const item = { id:randomBytes(12).toString('hex'), name:input.name.trim(), target:Number(input.target), period:input.period || 'Diária', createdAt:new Date().toISOString(), createdBy:account.name };
        items.unshift(item); await saveData('goals', items); return json(res, 201, { item });
      }
      if (req.method === 'GET' && url.pathname === '/api/events') return json(res, 200, { items:await readData('events') });
      if (req.method === 'POST' && url.pathname === '/api/events') {
        if (account.role === 'membro') return json(res, 403, { error:'Membros não podem criar eventos.' });
        const input = await body(req); if (!(input.name || '').trim() || !input.date) return json(res, 400, { error:'Informe o nome e a data do evento.' });
        const items = await readData('events'); const item = { id:randomBytes(12).toString('hex'), name:input.name.trim(), description:(input.description || '').trim(), date:input.date, time:input.time || '', owner:input.owner || account.name, status:['desenvolvedor','administração'].includes(account.role) ? 'Publicado' : 'Aguardando aprovação', createdBy:account.name, createdAt:new Date().toISOString() };
        items.unshift(item); await saveData('events', items); return json(res, 201, { item });
      }
      if (req.method === 'GET' && url.pathname === '/api/performance') {
        let recruits = await readData('recruitments');
        if (account.role === 'membro') recruits = recruits.filter(x => x.creatorId === account.id);
        else if (account.role === 'gestão') { const day = new Date().toISOString().slice(0,10); recruits = recruits.filter(x => x.createdAt.slice(0,10) === day); }
        const rows = Object.values(recruits.reduce((all, x) => { const row = all[x.creatorId] ||= { recruiter:x.recruiter, total:0, approved:0 }; row.total++; if (x.status === 'Aprovado / Efetivado') row.approved++; return all; }, {})).sort((a,b) => b.total-a.total);
        return json(res, 200, { rows, total:recruits.length });
      }
      if (req.method === 'GET' && url.pathname === '/api/settings') { const settings = await readData('settings'); return json(res, 200, { settings:settings[account.id] || { accent:'#a6f36b' } }); }
      if (req.method === 'POST' && url.pathname === '/api/settings') {
        const input = await body(req); if (!/^#[0-9a-fA-F]{6}$/.test(input.accent || '')) return json(res, 400, { error:'Escolha uma cor hexadecimal válida.' });
        const settings = await readData('settings'); settings[account.id] = { accent:input.accent }; await saveData('settings', settings); return json(res, 200, { settings:settings[account.id] });
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

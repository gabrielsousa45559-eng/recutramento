import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não foi informado.');
const { Pool } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const collections = {
  users: { file:'users.json', fallback:[] },
  recruitments: { file:'recruitments.json', fallback:[] },
  goals: { file:'goals.json', fallback:[] },
  events: { file:'events.json', fallback:[] },
  settings: { file:'settings.json', fallback:{} },
  blacklist: { file:'blacklist.json', fallback:[] },
  audit: { file:'audit.json', fallback:[] },
  commands: { file:'staff-commands.json', fallback:[] },
  rules: { file:'internal-rules.json', fallback:[] },
  permissions: { file:'permissions.json', fallback:{} }
};
const localData = {};
for (const [key, spec] of Object.entries(collections)) {
  const file = path.join(dataDir, spec.file);
  localData[key] = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : spec.fallback;
}
if (!Array.isArray(localData.users) || !localData.users.length) throw new Error('Não encontrei contas locais em data/users.json.');
const pool = new Pool({ connectionString:process.env.DATABASE_URL, max:1, connectionTimeoutMillis:10000 });
const isEmpty = (key, value) => Array.isArray(collections[key].fallback)
  ? Array.isArray(value) && value.length === 0
  : value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0;

try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE TABLE IF NOT EXISTS app_data (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
    await client.query('LOCK TABLE app_data IN EXCLUSIVE MODE');
    for (const key of Object.keys(collections)) {
      const result = await client.query('SELECT value FROM app_data WHERE key=$1',[key]);
      if (result.rows.length && !isEmpty(key,result.rows[0].value)) throw new Error('A base de destino já contém dados. A importação foi cancelada para proteger o que já está salvo.');
    }
    for (const [key,value] of Object.entries(localData)) {
      await client.query('INSERT INTO app_data (key,value,updated_at) VALUES ($1,$2::jsonb,now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()',[key,JSON.stringify(value)]);
    }
    await client.query('COMMIT');
    const counts = Object.fromEntries(Object.entries(localData).map(([key,value])=>[key,Array.isArray(value)?value.length:Object.keys(value||{}).length]));
    console.log(`Importação concluída: ${counts.users} usuário(s), ${counts.recruitments} recrutamento(s), ${counts.audit} log(s).`);
  } catch (error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  console.error(`Importação não concluída${error.code?` (${error.code})`:''}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}

// Server-side Snowflake client: Cortex Chat Completions + SQL API, both with a
// programmatic access token. Runs in Node only; never import this from src/.
//
// Docs:
//   https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-rest-api
//   https://docs.snowflake.com/en/developer-guide/sql-api/submitting-requests
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const ENV_FILE = fileURLToPath(new URL('./.env', import.meta.url));
const TIMEOUT_MS = 30_000;

// server/.env is re-read whenever it changes, so editing it doesn't need a
// server restart. Non-empty real environment variables win over the file.
let fileEnv = {};
let fileStamp = null;
function readEnvFile() {
  let stamp = null;
  try {
    const stat = statSync(ENV_FILE);
    stamp = `${stat.mtimeMs}:${stat.size}`;
  } catch { /* no file */ }
  if (stamp === fileStamp) return fileEnv;
  fileStamp = stamp;
  fileEnv = stamp ? parseEnv(readFileSync(ENV_FILE, 'utf8')) : {};
  return fileEnv;
}

export function config() {
  const file = readEnvFile();
  const env = new Proxy({}, { get: (_, key) => process.env[key] || file[key] });
  return {
    pat: env.SNOWFLAKE_PAT,
    accountUrl: (env.SNOWFLAKE_ACCOUNT_URL || 'https://FCFYASQ-ZH36049.snowflakecomputing.com').replace(/\/+$/, ''),
    model: env.SNOWFLAKE_MODEL || 'llama3.3-70b',
    warehouse: env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
    database: env.SNOWFLAKE_DATABASE || 'BUDGIE_DB',
    schema: env.SNOWFLAKE_SCHEMA || 'APP',
  };
}

// Fully qualified events table, e.g. BUDGIE_DB.APP.EVENTS. Naming it in full means a missing
// database/schema grant can't silently fall back to some other context.
export function eventsTable() {
  const { database, schema } = config();
  const plain = /^[A-Za-z_][A-Za-z0-9_$]*$/;
  if (!plain.test(database) || !plain.test(schema)) {
    throw new ApiError(500, 'SNOWFLAKE_DATABASE and SNOWFLAKE_SCHEMA must be plain names like BUDGIE_DB and APP.', {
      code: 'bad_config',
    });
  }
  return `${database}.${schema}.EVENTS`;
}

// A failure the browser can show as-is: { message, fix? } plus an HTTP status.
export class ApiError extends Error {
  constructor(status, message, { fix, fields, code } = {}) {
    super(message);
    this.status = status;
    this.body = { error: { code, message, ...(fix && { fix }), ...(fields && { fields }) } };
  }
}

function requirePat() {
  const { pat } = config();
  if (!pat) {
    throw new ApiError(500, 'Snowflake is not configured on the server yet.', {
      code: 'missing_secret',
      fix: 'Add SNOWFLAKE_PAT=<your token> to server/.env (copy server/.env.example), then restart npm run dev.',
    });
  }
  return pat;
}

const clip = (s, max) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

async function snowflakeFetch(path, init) {
  const pat = requirePat();
  try {
    return await fetch(`${config().accountUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'budgie/1.0',
        Authorization: `Bearer ${pat}`,
        'X-Snowflake-Authorization-Token-Type': 'PROGRAMMATIC_ACCESS_TOKEN',
      },
    });
  } catch (err) {
    if (err?.name === 'TimeoutError') {
      throw new ApiError(503, 'Snowflake took too long to answer. Try again.', { code: 'snowflake_timeout' });
    }
    console.error('[snowflake] request failed', err);
    throw new ApiError(502, 'Could not reach Snowflake. Check your connection and SNOWFLAKE_ACCOUNT_URL.', {
      code: 'snowflake_unreachable',
    });
  }
}

async function readDetail(res) {
  const raw = await res.text();
  try {
    const body = JSON.parse(raw);
    return String(body?.message ?? body?.error?.message ?? body?.error ?? raw).trim();
  } catch {
    return raw.trim();
  }
}

// Map Snowflake HTTP failures to messages that say exactly what to fix.
// Never falls back to another role or token.
function toApiError(status, detail, { what }) {
  const said = detail ? ` Snowflake said: "${clip(detail, 300)}"` : '';
  const { model, warehouse, database, schema } = config();
  const table = `${database}.${schema}.EVENTS`;

  if (status === 401 && /network policy/i.test(detail)) {
    return new ApiError(502, `Snowflake requires a network policy before this access token can be used.${said}`, {
      code: 'snowflake_network_policy',
      fix: 'As ACCOUNTADMIN, either attach a network policy that allows this computer\'s IP to your Snowflake user, or give the user an authentication policy with PAT_POLICY = (NETWORK_POLICY_EVALUATION = ENFORCED_NOT_REQUIRED). See snowflake/setup.sql.',
    });
  }
  if (status === 401) {
    return new ApiError(502, `Snowflake did not accept the access token.${said}`, {
      code: 'snowflake_auth',
      fix: 'Check that SNOWFLAKE_PAT in server/.env is current. A PAT for a person user also needs a network policy (or an authentication policy with NETWORK_POLICY_EVALUATION = ENFORCED_NOT_REQUIRED).',
    });
  }
  if (status === 403 && what === 'cortex') {
    return new ApiError(502, `The token's role is not allowed to call Cortex over REST.${said}`, {
      code: 'snowflake_permission',
      fix: 'As an admin, run: GRANT DATABASE ROLE SNOWFLAKE.CORTEX_USER TO ROLE BUDGIE_AI_ROLE;',
    });
  }
  if (status === 400 && what === 'cortex' && /model/i.test(detail)) {
    return new ApiError(502, `Snowflake rejected the model "${model}".${said}`, {
      code: 'snowflake_model',
      fix: 'Set SNOWFLAKE_MODEL in server/.env to a model the Cortex REST API lists for your region (for example snowflake-llama-3.3-70b), then restart npm run dev.',
    });
  }
  if (what === 'sql' && (status === 403 || status === 422)) {
    if (/warehouse/i.test(detail)) {
      return new ApiError(502, `The token's role can't use warehouse ${warehouse}.${said}`, {
        code: 'snowflake_permission',
        fix: `As an admin, run: GRANT USAGE ON WAREHOUSE ${warehouse} TO ROLE BUDGIE_AI_ROLE; (or set SNOWFLAKE_WAREHOUSE in server/.env).`,
      });
    }
    if (/invalid identifier 'ADDRESS'/i.test(detail)) {
      return new ApiError(502, `${table} doesn't have the ADDRESS column yet.${said}`, {
        code: 'snowflake_schema',
        fix: `As ACCOUNTADMIN, run: ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ADDRESS STRING; (existing posts are kept)`,
      });
    }
    if (/does not exist or not authorized|insufficient privileges/i.test(detail)) {
      return new ApiError(502, `The token's role can't read or write ${table}.${said}`, {
        code: 'snowflake_permission',
        fix: `As ACCOUNTADMIN, run steps 1–3 of snowflake/setup.sql. They create ${table} if it's missing (existing data is kept) and grant BUDGIE_AI_ROLE USAGE on ${warehouse}, ${database} and ${database}.${schema}, plus SELECT and INSERT on the table.`,
      });
    }
  }
  if (status === 402) return new ApiError(502, `The Snowflake Cortex budget is used up.${said}`, { code: 'snowflake_budget' });
  if (status === 429) return new ApiError(503, 'Snowflake is rate-limiting requests. Wait a minute and try again.', { code: 'snowflake_rate_limit' });
  if (status === 503 || status === 504) return new ApiError(503, 'Snowflake took too long to answer. Try again.', { code: 'snowflake_timeout' });
  return new ApiError(502, `Snowflake returned HTTP ${status}.${said}`, { code: 'snowflake_error' });
}

// Cortex Chat Completions. Returns the assistant's text.
export async function cortexComplete(messages) {
  const res = await snowflakeFetch('/api/v2/cortex/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: config().model,
      messages,
      temperature: 0.2,
      max_completion_tokens: 600,
      stream: false,
    }),
  });
  if (!res.ok) {
    const detail = await readDetail(res);
    console.error('[snowflake] cortex error', res.status, clip(detail, 500));
    throw toApiError(res.status, detail, { what: 'cortex' });
  }
  const body = await res.json().catch(() => null);
  return body?.choices?.[0]?.message?.content ?? '';
}

// One SQL statement with positional bindings: [{ type: 'TEXT', value: '...' }, ...].
// Returns rows as objects keyed by lower-cased column name (values are strings or null).
export async function runSql(statement, bindings = []) {
  const { warehouse, database, schema } = config();
  const res = await snowflakeFetch(`/api/v2/statements?requestId=${crypto.randomUUID()}`, {
    method: 'POST',
    body: JSON.stringify({
      statement,
      timeout: 25,
      warehouse,
      database,
      schema,
      bindings: Object.fromEntries(bindings.map((b, i) => [String(i + 1), { type: b.type, value: b.value == null ? null : String(b.value) }])),
    }),
  });

  let body = null;
  let status = res.status;
  if (res.ok) body = await res.json();

  // 202: still running. Poll the status URL a few times.
  for (let i = 0; status === 202 && i < 10; i++) {
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    const poll = await snowflakeFetch(body.statementStatusUrl, { method: 'GET' });
    status = poll.status;
    body = poll.ok ? await poll.json() : null;
    if (!poll.ok) {
      const detail = await readDetail(poll);
      throw toApiError(status, detail, { what: 'sql' });
    }
  }
  if (status === 202) throw new ApiError(503, 'Snowflake took too long to answer. Try again.', { code: 'snowflake_timeout' });

  if (!res.ok) {
    const detail = await readDetail(res);
    console.error('[snowflake] sql error', res.status, clip(detail, 500));
    throw toApiError(res.status, detail, { what: 'sql' });
  }

  const columns = body.resultSetMetaData?.rowType?.map((c) => c.name.toLowerCase()) ?? [];
  return (body.data ?? []).map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}

# Budgie

Neighborhood discovery for people who just moved. React + Vite, Supabase auth, Google Maps.

```sh
npm install
npm run dev
```

Browser config lives in `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_MAPS_BROWSER_KEY`, `VITE_MAP_ID`).

## Business posts (Snowflake)

The business page (`#/business`) uses Snowflake for both parts:

- **Help me write it**: Snowflake Cortex (`/api/v2/cortex/v1/chat/completions`) drafts a title, description,
  category and perk from the business's notes. It only fills the form; nothing is published until the
  business reviews it and clicks **Publish post**.
- **Publish post**: the post is saved to `BUDGIE_DB.APP.EVENTS` through the Snowflake SQL API, and the
  community feed and map read it from there.

The browser never talks to Snowflake. It calls `/api/*` on the Vite dev/preview server (`server/api.js`),
and that server holds the Snowflake token.

### Setup

1. In a Snowflake worksheet, as an admin, run `snowflake/setup.sql` (creates the table and grants
   `BUDGIE_AI_ROLE` what it needs).
2. Copy `server/.env.example` to `server/.env` and paste your token after `SNOWFLAKE_PAT=`.
   `server/.env` is gitignored and only read by the server. Never give it a `VITE_` prefix.
3. `npm run dev` (restart it after changing `server/.env`), then open http://localhost:5173/#/business.

| Variable | Default |
| --- | --- |
| `SNOWFLAKE_PAT` | (required) |
| `SNOWFLAKE_ACCOUNT_URL` | `https://FCFYASQ-ZH36049.snowflakecomputing.com` |
| `SNOWFLAKE_MODEL` | `llama3.3-70b` |
| `SNOWFLAKE_WAREHOUSE` | `COMPUTE_WH` |
| `SNOWFLAKE_DATABASE` / `SNOWFLAKE_SCHEMA` | `BUDGIE_DB` / `APP` |

If Snowflake refuses a request, the page shows Snowflake's message and the exact grant or setting to fix.
A PAT for a person user also needs a network policy (or an authentication policy with
`NETWORK_POLICY_EVALUATION = ENFORCED_NOT_REQUIRED`).

The `/api` routes run inside Vite (`npm run dev` and `npm run preview`). A static host serving only `dist/`
won't have them.

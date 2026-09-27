-- Budgie: community posts table + the minimum grants the app needs.
-- Run in a Snowflake worksheet, one statement at a time, as ACCOUNTADMIN.
--
-- Safe to re-run: every CREATE uses IF NOT EXISTS, so existing objects and rows
-- are left untouched. Nothing here replaces, drops, truncates or deletes.
--
-- What the app (server/api.js) does with the PAT's role, BUDGIE_AI_ROLE:
--   SELECT ... FROM BUDGIE_DB.APP.EVENTS   (community feed)
--   INSERT INTO BUDGIE_DB.APP.EVENTS       (Publish post)
-- so it gets USAGE on the warehouse, database and schema, and SELECT + INSERT
-- on that one table. No UPDATE, DELETE, OWNERSHIP or future grants.
--
-- If you use different names, set SNOWFLAKE_WAREHOUSE / SNOWFLAKE_DATABASE /
-- SNOWFLAKE_SCHEMA in server/.env to match.

USE ROLE ACCOUNTADMIN;

-- 1. Database and schema (kept if they already exist)
CREATE DATABASE IF NOT EXISTS BUDGIE_DB;
CREATE SCHEMA IF NOT EXISTS BUDGIE_DB.APP;

-- 2. Events table (kept, with its rows, if it already exists)
CREATE TABLE IF NOT EXISTS BUDGIE_DB.APP.EVENTS (
  EVENT_ID         STRING        NOT NULL PRIMARY KEY,
  ZIP_CODE         STRING        NOT NULL,
  BUSINESS_NAME    STRING        NOT NULL,
  IS_PROMOTED      BOOLEAN       NOT NULL DEFAULT TRUE,
  TITLE            STRING        NOT NULL,
  DESCRIPTION      STRING        NOT NULL,
  CATEGORY         STRING        NOT NULL,
  STARTS_AT        TIMESTAMP_TZ  NOT NULL,
  DATE_TIME_LABEL  STRING        NOT NULL,  -- e.g. "Fri, Oct 3 • 7:00 PM", in the business's time zone
  NEW_MOVER_PERK   STRING,
  ATTENDEES_COUNT  NUMBER        NOT NULL DEFAULT 0,
  LAT              FLOAT         NOT NULL,
  LNG              FLOAT         NOT NULL,
  CREATED_AT       TIMESTAMP_TZ  NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  ADDRESS          STRING                   -- street address; the app requires it for new posts
);

-- 2b. Tables created before the address field: add the column (existing rows are kept, with no address)
ALTER TABLE BUDGIE_DB.APP.EVENTS ADD COLUMN IF NOT EXISTS ADDRESS STRING;

-- 3. Grants for BUDGIE_AI_ROLE (warehouse name must match SNOWFLAKE_WAREHOUSE; check with SHOW WAREHOUSES;)
GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE BUDGIE_AI_ROLE;
GRANT USAGE ON DATABASE BUDGIE_DB TO ROLE BUDGIE_AI_ROLE;
GRANT USAGE ON SCHEMA BUDGIE_DB.APP TO ROLE BUDGIE_AI_ROLE;
GRANT SELECT, INSERT ON TABLE BUDGIE_DB.APP.EVENTS TO ROLE BUDGIE_AI_ROLE;

-- 4. Check (should list the four grants above)
SHOW GRANTS TO ROLE BUDGIE_AI_ROLE;


-- ---------------------------------------------------------------------------
-- Already done if "Help me write it" works; listed for a fresh account.
-- ---------------------------------------------------------------------------

-- Cortex for the AI helper:
-- GRANT DATABASE ROLE SNOWFLAKE.CORTEX_USER TO ROLE BUDGIE_AI_ROLE;

-- Token access ("Fail : Network policy is required."). Run ONE option.
-- Find your user name with: SELECT CURRENT_USER();
--
-- Option A (quickest for the hackathon): this user's PATs work without a network
-- policy. If the user ever gets a network policy, it is still enforced.
-- CREATE AUTHENTICATION POLICY BUDGIE_DB.APP.BUDGIE_PAT_AUTH
--   PAT_POLICY = (NETWORK_POLICY_EVALUATION = ENFORCED_NOT_REQUIRED);
-- ALTER USER <YOUR_USER> SET AUTHENTICATION POLICY BUDGIE_DB.APP.BUDGIE_PAT_AUTH;
--
-- Option B (stricter): only your current public IP. This also applies to your own
-- Snowsight logins for this user, so a new IP (new Wi-Fi) locks you out until an
-- admin updates the list.
-- CREATE NETWORK POLICY BUDGIE_PAT_IPS ALLOWED_IP_LIST = ('<YOUR_PUBLIC_IP>');
-- ALTER USER <YOUR_USER> SET NETWORK_POLICY = BUDGIE_PAT_IPS;

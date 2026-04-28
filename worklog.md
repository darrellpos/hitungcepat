---
Task ID: 1
Agent: Main
Task: Fix login server error in production + fix convert calon pembeli + deploy

Work Log:
- Investigated root cause: Prisma schema used `env("LOCAL_DATABASE_URL")` but Vercel only had `DATABASE_URL` set
- Changed schema from `LOCAL_DATABASE_URL` to `DATABASE_URL` so both local (SQLite) and production (PostgreSQL) use the same env var
- Fixed raw SQL in auto-seed.ts: added missing `penggunaId` column to Pembeli CREATE TABLE, added Payment table CREATE TABLE
- Added `migrateExistingTablesPg()` function that runs `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for existing PostgreSQL databases
- Added `isPostgreSQL()` detection to separate PostgreSQL and SQLite code paths in ensureTablesExist
- Fixed convert calon pembeli endpoint: improved email handling to avoid empty string unique constraint issues
- Successfully deployed to Vercel production
- Swapped schema back to sqlite for local development

Stage Summary:
- Root cause of login failure: DATABASE_URL env var mismatch (schema expected LOCAL_DATABASE_URL, Vercel had DATABASE_URL)
- Root cause of convert failure: Missing penggunaId column on Pembeli table in PostgreSQL
- Deployed to https://darrellpos-new.vercel.app
- All fixes are backward compatible with existing data (ALTER TABLE IF NOT EXISTS for migration)
---
Task ID: 1
Agent: Main
Task: Auto-delete riwayat cetakan data on every new account registration

Work Log:
- Investigated codebase: RiwayatCetakan is the only DB table for hitung cetakan & riwayat data
- Potong kertas & hitung cetakan form state stored in localStorage (per-browser, client-side only)
- Added `db.riwayatCetakan.deleteMany({})` in `/api/register/route.ts` before creating new CalonPembeli
- Ran lint (only pre-existing PDF script errors), built Next.js, deployed to Vercel production
- Swapped Prisma schema back to SQLite for local dev

Stage Summary:
- Every new account registration now automatically clears ALL RiwayatCetakan records
- Deployed to: https://darrellpos-new.vercel.app
- Potong kertas has no backend data (client-side localStorage only), so nothing to clear server-side
---
Task ID: 2
Agent: Main
Task: Fix data isolation - admin and new accounts no longer share data

Work Log:
- Root cause: localStorage keys for potong-kertas and hitung-cetakan were generic (not per-user scoped)
  - `potong-kertas-form`, `potong-kertas-results`, `hitung-cetakan-form-data` were shared across all users on same browser
- Added `userKey()` helper function that prefixes localStorage keys with the logged-in user's ID
- Updated potong-kertas/page.tsx: all 3 localStorage keys now per-user scoped
- Updated hitung-cetakan/page.tsx: all 2 localStorage keys now per-user scoped
- Removed destructive `deleteMany({})` from register route (was deleting admin's data too)
- RiwayatCetakan DB data already filtered per-user via getDataFilter (userId: user.id)
- Deployed to production

Stage Summary:
- Each user now has completely isolated data: form state (localStorage) + riwayat (database)
- Admin and new demo accounts no longer share any data
- Deployed to: https://darrellpos-new.vercel.app

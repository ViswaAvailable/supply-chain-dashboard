# Change Log

## 2026-01-24: Security Hardening (Phase 1 & 2)

### Database Security
- Enabled RLS on `organizations` table
- Optimized all RLS policies using `(SELECT auth.uid())` pattern
- Fixed circular dependency in users table RLS policies

### Application Security
- Added `middleware.ts` for session refresh on all routes
- Added organization filters to all queries in `useForecastData.ts`
- Added ownership verification to mutations in `useEventMutations.ts`, `useSKUMutations.ts`
- Created `src/lib/validation/schemas.ts` with Zod validation
- Created `src/lib/rate-limit.ts` for rate limiting infrastructure
- Added rate limiting to admin API routes

### Auth Fixes
- Fixed infinite loading on root and login pages
- Added session timeout (5s) in `useAuth.tsx`
- Made `fetchOrgId` non-blocking
- Memoized Supabase client in `SupabaseProvider.tsx`

### Security Incident
- Removed `.mcp.json` containing leaked Supabase PAT
- Removed `.claude/`, `.cursor/` directories from repo
- Added these to `.gitignore`
- Updated `CLAUDE.md` with instructions on files to never commit

### Middleware Fix (Production)
- Updated middleware to run on ALL routes (was only `/dashboard`)
- Required for Supabase auth-helpers to properly refresh session cookies

### Documentation Added
- `APP_TESTING_FOR_SECURITY.md` - Security testing checklist
- `UPSTASH_SETUP.md` - Rate limiting setup guide
- `POSTGRES_UPGRADE.md` - Database upgrade instructions
- Updated `FUTURE_FEATURES.md` with Phase 3 & 4 security roadmap

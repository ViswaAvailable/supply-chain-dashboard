# PostgreSQL Security Update Guide

## Current Status

**Current Version**: `supabase-postgres-15.8.1.111`
**Status**: Security patches available
**Priority**: High - should be upgraded before production deployment

## Why Upgrade?

The Supabase security advisor flagged that your current Postgres version has outstanding security patches. Upgrading ensures:

- **Security**: Patches for known vulnerabilities
- **Stability**: Bug fixes and performance improvements
- **Compliance**: Up-to-date software for enterprise requirements

## Upgrade Steps

### 1. Schedule Maintenance Window

**Recommended Time**: Low-traffic period (e.g., Sunday 2:00 AM)

**Expected Downtime**: 5-15 minutes

**Communicate to Users**:
- Email notification 48 hours in advance
- In-app banner 24 hours before
- Status page update during maintenance

### 2. Pre-Upgrade Checklist

- [ ] Take a manual backup (just in case)
- [ ] Document current version: `supabase-postgres-15.8.1.111`
- [ ] Test application in staging environment
- [ ] Notify team members
- [ ] Have rollback plan ready

### 3. Perform Upgrade (Supabase Dashboard)

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Settings → Infrastructure

2. **Database Section**
   - Look for "Postgres Version" or "Upgrade Available"
   - Click "Upgrade Database"

3. **Select Maintenance Window**
   - Choose date and time
   - Supabase will schedule the upgrade
   - You'll receive confirmation email

4. **Monitor Progress**
   - Watch for completion notification
   - Check project logs for any issues

### 4. Post-Upgrade Verification

**Immediately After Upgrade**:

1. **Check Database Accessibility**
   ```bash
   # In your local environment
   npm run dev
   ```

2. **Verify Critical Queries**
   - Test login
   - Load dashboard
   - Create/edit/delete an event
   - Verify forecasts display

3. **Check RLS Policies**
   ```sql
   -- In Supabase SQL Editor
   SELECT tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public';
   ```

4. **Test Multi-Tenant Isolation**
   - Login as different organization users
   - Verify data isolation still works

5. **Check Migrations**
   ```bash
   # Verify all migrations are applied
   supabase db pull
   ```

**Within 24 Hours**:

- [ ] Monitor error logs
- [ ] Check query performance (should be same or better)
- [ ] Verify scheduled jobs still running
- [ ] Test user invitations
- [ ] Confirm email notifications working

### 5. Rollback Plan (If Issues Occur)

If critical issues arise:

1. **Contact Supabase Support Immediately**
   - support@supabase.com
   - Include project ref and issue description

2. **Temporary Workaround**
   - Point application to backup database (if configured)
   - Show maintenance page to users

3. **Version Rollback**
   - Supabase can rollback within 24 hours
   - Requires support ticket with severity level

## Common Issues & Solutions

### Issue: Connection Timeout After Upgrade

**Solution**:
```bash
# Restart connection pool
# In your app, restart the server
npm run dev
```

### Issue: RLS Policies Not Working

**Check**:
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

**Fix**: Re-apply RLS enable if needed:
```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

### Issue: Slow Queries After Upgrade

**Check indexes**:
```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';
```

**Run ANALYZE**:
```sql
ANALYZE;
```

## Testing in Staging

**Before upgrading production**:

1. Create a staging branch in Supabase
2. Perform upgrade on staging first
3. Run full regression tests
4. Monitor for 24-48 hours
5. Then upgrade production

## Emergency Contacts

**Supabase Support**:
- Email: support@supabase.com
- Dashboard: Click "?" icon → "Support"
- Discord: https://discord.supabase.com

**Your Team**:
- Database Admin: [Add contact]
- On-Call Engineer: [Add contact]

## Post-Upgrade Optimization

After successful upgrade, consider:

1. **Run VACUUM ANALYZE**
   ```sql
   VACUUM ANALYZE;
   ```

2. **Check for New Features**
   - Review Postgres release notes
   - Update application to use new features

3. **Update Documentation**
   - Record new version number
   - Update this document

## Automation (Future)

Consider setting up:
- Automated backups before upgrades
- Staging environment auto-upgrades
- Monitoring alerts for new versions

---

**Last Updated**: January 2026
**Next Review**: After Production Upgrade

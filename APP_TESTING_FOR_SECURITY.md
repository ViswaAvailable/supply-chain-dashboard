# Security Testing Checklist - LemonDots AI

**Version**: 1.0
**Branch**: security/enterprise-hardening
**Date**: January 24, 2026
**Tester**: _________________
**Test Environment**: Development (localhost:3000)

---

## Overview

This document outlines the testing procedures for validating security enhancements implemented in Phase 1 and Phase 2 of the enterprise hardening initiative. These changes ensure the application is ready for enterprise deployment with multi-tenant data isolation, server-side authentication, and comprehensive input validation.

### What Changed

**Phase 1 - Critical Security Fixes**:
- ✅ Enabled Row Level Security (RLS) on organizations table
- ✅ Added organization filtering to all data queries (defense-in-depth)
- ✅ Added ownership verification to all update/delete operations
- ✅ Implemented server-side route protection (Next.js middleware)
- ✅ Added comprehensive input validation (Zod schemas)

**Phase 2 - High Priority Security Fixes**:
- ✅ Fixed function search_path vulnerabilities (5 Postgres functions)
- ✅ Optimized RLS policies for performance (35 policies)
- ✅ Added foreign key indexes (12 indexes)
- ✅ Implemented rate limiting infrastructure (requires Upstash Redis)

---

## Test Environment Setup

### Prerequisites

1. **Server Running**: http://localhost:3000
2. **Test Credentials**:
   - Email: `kiesviswa@gmail.com`
   - Password: `testtest`
3. **Browser**: Chrome, Firefox, or Safari (latest version)
4. **Tools**: Browser Developer Tools (F12 or Cmd+Option+I)

### Before You Start

- [ ] Clear browser cache and cookies
- [ ] Open browser in normal mode (not incognito) for first test
- [ ] Open Developer Tools (F12)
- [ ] Navigate to Console tab to check for errors
- [ ] Navigate to Network tab to monitor requests

---

## Test Cases

### **TC-001: Server-Side Authentication Protection**

**Priority**: ⭐ CRITICAL
**Objective**: Verify unauthenticated users cannot access protected routes

**Steps**:
1. Open a **new incognito/private browser window**
2. Navigate to: http://localhost:3000/dashboard
3. Observe the browser behavior

**Expected Result**:
- ✅ Immediately redirected to login page
- ✅ URL changes to: http://localhost:3000/login?redirect=/dashboard
- ✅ Dashboard content never displays

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-001-redirect.png_

**Notes**:
- This test verifies Next.js middleware is protecting routes server-side
- If dashboard loads without authentication, this is a CRITICAL security issue

---

### **TC-002: Login Flow & Session Management**

**Priority**: ⭐ CRITICAL
**Objective**: Verify authentication flow works correctly

**Steps**:
1. Navigate to: http://localhost:3000
2. Verify you're redirected to login page (if not already logged in)
3. Enter credentials:
   - Email: `kiesviswa@gmail.com`
   - Password: `testtest`
4. Click "Sign In"
5. Open Network tab in Dev Tools
6. Observe the requests made after login

**Expected Result**:
- ✅ Login succeeds without errors
- ✅ Redirected to: http://localhost:3000/dashboard
- ✅ Dashboard loads with data
- ✅ Network tab shows request to `users` table fetching `org_id`
- ✅ No errors in Console tab

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshots**:
- _TC-002-login.png_ (login page)
- _TC-002-dashboard.png_ (dashboard after login)
- _TC-002-network.png_ (network tab showing org_id fetch)

**Notes**:
- AuthContext should fetch user's org_id from database
- If "Organization ID not found" error appears, auth context may be broken

---

### **TC-003: Organization Data Filtering**

**Priority**: ⭐ CRITICAL
**Objective**: Verify all queries filter by organization_id

**Steps**:
1. Login successfully (use TC-002)
2. Navigate to: http://localhost:3000/dashboard/events
3. Open Network tab in Dev Tools
4. Filter network requests by: "events"
5. Click on the request to see details
6. Go to "Payload" or "Preview" tab
7. Look for query parameters

**Expected Result**:
- ✅ Request URL contains organization_id filter
- ✅ Example: `.eq('organization_id', 'some-uuid-here')`
- ✅ Events list displays only current organization's events

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-003-network-filter.png_

**Notes**:
- This test verifies defense-in-depth (app-level + database-level filtering)
- If no organization_id filter present, cross-tenant data leak is possible

---

### **TC-004: Input Validation - Invalid Uplift Percentage**

**Priority**: ⭐ IMPORTANT
**Objective**: Verify Zod validation rejects invalid input

**Steps**:
1. Navigate to: http://localhost:3000/dashboard/events
2. Click "Create Event" or "New Event" button
3. Fill in the form:
   - Name: "Test Event"
   - Type: "Promo"
   - Start Date: Today's date
   - End Date: Tomorrow's date
   - Mode: "Uplift"
   - **Uplift %: 600** (invalid - max is 500)
4. Click "Create" or "Save"

**Expected Result**:
- ✅ Form validation error appears
- ✅ Error message: "Uplift percentage cannot exceed 500%"
- ✅ Event is NOT created
- ✅ No API request sent (check Network tab)

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-004-validation-error.png_

**Notes**:
- If event is created with 600%, validation is broken
- Valid range is -100% to 500%

---

### **TC-005: Input Validation - Invalid Date Range**

**Priority**: ⭐ IMPORTANT
**Objective**: Verify date validation works

**Steps**:
1. Navigate to: http://localhost:3000/dashboard/events
2. Click "Create Event"
3. Fill in the form:
   - Name: "Test Event 2"
   - Type: "Holiday"
   - **Start Date: 2026-02-15**
   - **End Date: 2026-02-01** (before start date)
   - Mode: "Flag"
4. Click "Create"

**Expected Result**:
- ✅ Validation error appears
- ✅ Error message: "End date must be on or after start date"
- ✅ Event is NOT created

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-005-date-validation.png_

---

### **TC-006: Input Validation - Empty Required Fields**

**Priority**: ⭐ IMPORTANT
**Objective**: Verify required field validation

**Steps**:
1. Navigate to Events page
2. Click "Create Event"
3. Leave **Name field empty**
4. Fill other required fields
5. Click "Create"

**Expected Result**:
- ✅ Validation error: "Event name is required"
- ✅ Event is NOT created

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-006-required-field.png_

---

### **TC-007: Event Creation (Valid Data)**

**Priority**: ⭐ IMPORTANT
**Objective**: Verify valid events can be created

**Steps**:
1. Navigate to Events page
2. Click "Create Event"
3. Fill in valid data:
   - Name: "Test Holiday Event"
   - Type: "Holiday"
   - Start Date: Tomorrow
   - End Date: Day after tomorrow
   - Mode: "Uplift"
   - Uplift %: 25
   - Scope: "All" (or select specific outlet/category/SKU)
4. Click "Create"

**Expected Result**:
- ✅ Event created successfully
- ✅ Success message/toast appears
- ✅ New event appears in events list
- ✅ No console errors

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-007-event-created.png_

**Notes**:
- After creation, verify event appears with correct details
- Check that organization_id was auto-added to the event

---

### **TC-008: Event Update**

**Priority**: ⭐ IMPORTANT
**Objective**: Verify existing events can be updated

**Steps**:
1. Navigate to Events page
2. Find an existing event
3. Click "Edit" or click on the event
4. Modify the name: Add " - Updated" to the name
5. Click "Save"

**Expected Result**:
- ✅ Event updated successfully
- ✅ Updated name displays in list
- ✅ No errors

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-008-event-updated.png_

---

### **TC-009: Event Deletion**

**Priority**: ⭐ IMPORTANT
**Objective**: Verify events can be deleted

**Steps**:
1. Navigate to Events page
2. Find the test event created in TC-007
3. Click "Delete" or trash icon
4. Confirm deletion if prompted

**Expected Result**:
- ✅ Event deleted successfully
- ✅ Event removed from list
- ✅ Success message appears

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-009-event-deleted.png_

---

### **TC-010: SKU Settings - Minimum Quantity Update**

**Priority**: ⭐ IMPORTANT
**Objective**: Verify SKU mutations have validation and ownership checks

**Steps**:
1. Navigate to: http://localhost:3000/dashboard/sku-settings
2. Find any SKU in the list
3. Click "Edit" or the pencil icon
4. Change "Minimum Quantity" to: **50**
5. Click "Save"

**Expected Result**:
- ✅ Minimum quantity updated successfully
- ✅ New value displays in table
- ✅ No errors

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-010-sku-updated.png_

**Notes**:
- Valid range is 0 to 1,000,000
- Test with invalid value (e.g., -10) to verify validation

---

### **TC-011: SKU Settings - Invalid Minimum Quantity**

**Priority**: Medium
**Objective**: Verify SKU validation rejects invalid values

**Steps**:
1. Navigate to SKU Settings
2. Edit a SKU
3. Enter Minimum Quantity: **-50** (negative value)
4. Click "Save"

**Expected Result**:
- ✅ Validation error: "Minimum quantity cannot be negative"
- ✅ Update is NOT saved

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-011-sku-validation.png_

---

### **TC-012: Dashboard Page Load**

**Priority**: ⭐ IMPORTANT
**Objective**: Verify dashboard displays correctly with all widgets

**Steps**:
1. Navigate to: http://localhost:3000/dashboard
2. Wait for page to fully load
3. Observe all sections

**Expected Result**:
- ✅ KPI cards display (4 cards: Total Revenue, Forecast Accuracy, etc.)
- ✅ Forecast chart renders
- ✅ Events appear on chart (if any events exist)
- ✅ Page loads in < 2 seconds
- ✅ No console errors

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-012-dashboard.png_

**Console Errors**: ___________________

---

### **TC-013: Daily Forecast Page**

**Priority**: ⭐ IMPORTANT
**Objective**: Verify daily forecast table loads

**Steps**:
1. Navigate to: http://localhost:3000/dashboard/daily
2. Wait for table to load

**Expected Result**:
- ✅ Table displays with forecast data
- ✅ Columns: Date, SKU, Outlet, Forecast, etc.
- ✅ Data is filtered by organization
- ✅ Export button present (if implemented)
- ✅ No console errors

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-013-daily-forecast.png_

---

### **TC-014: Event Analysis Page**

**Priority**: Medium
**Objective**: Verify event analysis page works

**Steps**:
1. Navigate to: http://localhost:3000/dashboard/event-analysis
2. Wait for page to load

**Expected Result**:
- ✅ Page loads without errors
- ✅ Analysis data displays (if events exist)
- ✅ No console errors

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-014-event-analysis.png_

---

### **TC-015: Profile Page - Team Management (Admin Only)**

**Priority**: Medium
**Objective**: Verify profile page and admin features

**Steps**:
1. Navigate to: http://localhost:3000/dashboard/profile
2. Scroll down to "Team Management" section
3. Observe available actions

**Expected Result**:
- ✅ Profile information displays
- ✅ If user is admin: "Invite User" button visible
- ✅ If user is admin: Team members list visible
- ✅ If user is viewer: Only own profile visible
- ✅ No console errors

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-015-profile.png_

**Notes**:
- Test user role from database to confirm admin/viewer status

---

### **TC-016: Navigation & Sidebar**

**Priority**: Medium
**Objective**: Verify navigation works across all pages

**Steps**:
1. Starting from dashboard, click through all menu items:
   - Dashboard
   - Daily Forecast
   - Events
   - Event Analysis
   - SKU Settings
   - Profile
2. Observe page transitions

**Expected Result**:
- ✅ All pages load successfully
- ✅ Active page highlighted in sidebar
- ✅ No broken links
- ✅ No console errors during navigation

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

---

### **TC-017: Logout Functionality**

**Priority**: ⭐ IMPORTANT
**Objective**: Verify logout clears session

**Steps**:
1. From any dashboard page, click logout button/link
2. Observe behavior
3. Try to navigate back to dashboard

**Expected Result**:
- ✅ Redirected to login page
- ✅ Session cleared
- ✅ Cannot access dashboard without logging in again

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Screenshot**: _TC-017-logout.png_

---

### **TC-018: Console Errors Check**

**Priority**: ⭐ CRITICAL
**Objective**: Verify no JavaScript errors occur during normal usage

**Steps**:
1. Open Console tab in Dev Tools
2. Navigate through all pages:
   - Dashboard
   - Events
   - Daily Forecast
   - SKU Settings
   - Profile
3. Perform actions:
   - Create event
   - Edit SKU
   - Delete event
4. Monitor console for errors

**Expected Result**:
- ✅ No red errors in console
- ⚠️ Yellow warnings are acceptable (note them down)
- ✅ No network failures (check Network tab)

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail

**Errors Found**: ___________________

**Screenshot**: _TC-018-console.png_

---

### **TC-019: Performance Check**

**Priority**: Medium
**Objective**: Verify application performance is acceptable

**Steps**:
1. Navigate to Dashboard
2. Open Network tab
3. Reload page (Cmd+R or Ctrl+R)
4. Check "Load" time at bottom of Network tab
5. Navigate to Events page
6. Check query response times

**Expected Result**:
- ✅ Dashboard loads in < 2 seconds
- ✅ Data queries respond in < 500ms
- ✅ No queries take > 2 seconds
- ✅ Page feels responsive

**Actual Result**: ___________________

**Load Time**: _____ seconds

**Pass/Fail**: [ ] Pass  [ ] Fail

**Notes**:
- RLS optimization should keep queries fast
- If queries are slow (> 2s), RLS policies may need review

---

### **TC-020: Rate Limiting (Optional - Only if Upstash Configured)**

**Priority**: Low
**Objective**: Verify rate limiting works if configured

**Steps**:
1. Navigate to Profile page
2. If admin: Try to invite a user
3. Repeat invitation 11 times rapidly
4. Observe behavior on 11th attempt

**Expected Result** (if Upstash configured):
- ✅ First 10 requests succeed
- ✅ 11th request blocked with 429 error
- ✅ Error message: "Too many requests. Please try again later."

**Expected Result** (if Upstash NOT configured):
- ⚠️ All requests succeed
- ⚠️ Console warning: "Rate limiting not configured"

**Actual Result**: ___________________

**Pass/Fail**: [ ] Pass  [ ] Fail  [ ] N/A (Upstash not configured)

**Screenshot**: _TC-020-rate-limit.png_

---

## Browser Compatibility Testing

Test the application in multiple browsers:

| Browser | Version | TC-001 | TC-002 | TC-012 | Overall | Notes |
|---------|---------|--------|--------|--------|---------|-------|
| Chrome | ______ | [ ] | [ ] | [ ] | [ ] Pass / [ ] Fail | |
| Firefox | ______ | [ ] | [ ] | [ ] | [ ] Pass / [ ] Fail | |
| Safari | ______ | [ ] | [ ] | [ ] | [ ] Pass / [ ] Fail | |
| Edge | ______ | [ ] | [ ] | [ ] | [ ] Pass / [ ] Fail | |

---

## Security Test Results Summary

### Critical Issues (Block Release)
- [ ] No critical issues found
- [ ] Critical issues found (list below):

___________________
___________________
___________________

### High Priority Issues (Should Fix)
- [ ] No high priority issues
- [ ] High priority issues found (list below):

___________________
___________________
___________________

### Medium/Low Issues (Can Fix Later)
- [ ] No medium/low issues
- [ ] Medium/low issues found (list below):

___________________
___________________
___________________

---

## Bug Report Template

**Bug ID**: ___________________
**Severity**: [ ] Critical  [ ] High  [ ] Medium  [ ] Low
**Test Case**: TC-___
**Browser**: ___________________
**Steps to Reproduce**:
1. ___________________
2. ___________________
3. ___________________

**Expected Result**: ___________________

**Actual Result**: ___________________

**Screenshot**: ___________________

**Console Errors**: ___________________

**Additional Notes**: ___________________

---

## Sign-Off

**Tester Name**: ___________________
**Date**: ___________________
**Overall Result**: [ ] Pass  [ ] Fail  [ ] Pass with Minor Issues

**Recommendation**:
- [ ] Ready for deployment
- [ ] Fix critical issues before deployment
- [ ] Requires additional testing

**Signature**: ___________________

---

**Document Version**: 1.0
**Last Updated**: January 24, 2026
**Contact for Questions**: [Your contact info]

# Future Features: LemonDots AI

> This document tracks planned features that are not in the immediate scope. Each feature includes a brief execution plan.

---

## Table of Contents

1. [Manual Forecast Trigger (UI)](#1-manual-forecast-trigger-ui)
2. [Add New Product Feature](#2-add-new-product-feature)
3. [Cloud Deployment of ML Pipeline](#3-cloud-deployment-of-ml-pipeline)
4. [Forecast Accuracy Tracking](#4-forecast-accuracy-tracking)
5. [Automated Alerts & Notifications](#5-automated-alerts--notifications)

---

## 1. Manual Forecast Trigger (UI)

**Status**: Planned (after ML pipeline is stable)

**Description**:
Allow admin users to trigger a forecast refresh directly from the web app, rather than waiting for the scheduled 21:00 daily run.

**Use Cases**:
- User adds a new event and wants to see updated forecasts immediately
- Data correction was made and forecasts need recalculation
- Demo purposes when onboarding a new team member

**Execution Plan**:

| Step | Task | Details |
|------|------|---------|
| 1 | Create API endpoint | `POST /api/trigger-forecast` - authenticates user, validates admin role |
| 2 | Add ML pipeline trigger | API calls the ML pipeline (local: subprocess, cloud: HTTP trigger) |
| 3 | Add UI button | "Refresh Forecasts" button in Dashboard header (admin only) |
| 4 | Show progress indicator | Loading state while forecasts generate (~2-5 minutes) |
| 5 | Notify on completion | Toast notification: "Forecasts updated successfully" |
| 6 | Add rate limiting | Prevent abuse - max 3 manual triggers per hour |

**UI Location**:
```
┌─────────────────────────────────────────────────────────┐
│  Dashboard Header                                        │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Demand Forecast          [Refresh Forecasts ↻] [...] ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Dependencies**:
- ML pipeline running smoothly in production
- Reliable execution time (under 5 minutes)

**Estimated Effort**: Medium

---

## 2. Add New Product Feature

**Status**: Planned (Priority 3 in CLAUDE.md)

**Description**:
Allow users to add new products (SKUs) that don't have historical sales data by referencing an existing similar product.

**How It Works**:
1. User creates new SKU in SKU Settings
2. User selects a "reference product" (existing SKU with history)
3. User sets a "similarity factor" (0.1 to 1.0)
4. ML uses reference product's forecast × similarity factor
5. After 12 months, new product uses its own data

**Execution Plan**:

| Step | Task | Details |
|------|------|---------|
| 1 | Update SKU Settings UI | Add "New Product" toggle, reference SKU dropdown, similarity slider |
| 2 | Validate schema | `skus` table already has `is_new_product`, `reference_sku_id`, `similarity_factor` |
| 3 | Update ML pipeline | When `is_new_product = true`, use reference SKU's forecast × similarity |
| 4 | Add blending logic | Gradually transition from reference to own data over 12 months |
| 5 | Add cannibalization | Apply impact to affected SKUs (reduce their forecasts) |
| 6 | Test with demo data | Verify forecasts appear correctly for new products |

**UI Mockup**:
```
┌─────────────────────────────────────────────────────────┐
│  Add New Product                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Product Name: [Dark Truffle Box          ]          ││
│  │ Category:     [Premium Collection     ▼]            ││
│  │ Price:        [₹ 450                    ]           ││
│  │                                                      ││
│  │ ☑ This is a new product (no sales history)          ││
│  │                                                      ││
│  │ Reference Product: [Milk Truffle Box   ▼]           ││
│  │ Similarity: [====●=====] 80%                        ││
│  │                                                      ││
│  │ Cannibalization Impact:                              ││
│  │ • Milk Truffle Box: [-15%]                          ││
│  │ • Assorted Gift Box: [-5%]                          ││
│  │                                                      ││
│  │              [Cancel]  [Add Product]                 ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Dependencies**:
- ML pipeline generating forecasts
- SKU Settings page complete

**Estimated Effort**: Large

---

## 3. Cloud Deployment of ML Pipeline

**Status**: Planned (after local pipeline is stable)

**Description**:
Move the ML pipeline from local execution to cloud infrastructure for reliability, scalability, and easier maintenance.

**Options to Evaluate**:

| Platform | Pros | Cons |
|----------|------|------|
| **AWS Lambda + EventBridge** | Serverless, pay-per-use | Cold start, 15 min limit |
| **AWS ECS (Fargate)** | No time limit, containerized | More setup, always-on cost |
| **Google Cloud Run** | Serverless, easy deploy | Google ecosystem |
| **Railway / Render** | Simple, developer-friendly | Less control |

**Execution Plan**:

| Step | Task | Details |
|------|------|---------|
| 1 | Containerize pipeline | Create Dockerfile for ML pipeline |
| 2 | Evaluate platforms | Test on 2-3 options with sample workload |
| 3 | Set up CI/CD | Auto-deploy on code push |
| 4 | Configure scheduling | Daily 21:00 trigger |
| 5 | Add HTTP trigger | For manual forecast feature |
| 6 | Set up monitoring | Logs, alerts, error tracking |
| 7 | Migrate production | Move from local to cloud |

**Dependencies**:
- ML pipeline stable locally
- At least one paying customer (to justify cloud costs)

**Estimated Effort**: Medium-Large

---

## 4. Forecast Accuracy Tracking

**Status**: Planned (after forecasts are running)

**Description**:
Track how accurate the ML predictions are compared to actual sales. Currently, the dashboard shows a **hardcoded placeholder (92.4%)** for forecast accuracy. This feature replaces that with real calculations.

### Part A: Real Accuracy KPI (Quick Win)

**What**: Make the existing "Forecast Accuracy" KPI card on the dashboard show real MAPE instead of the hardcoded 92.4%.

**Current code** (`src/app/dashboard/page.tsx`, line 110-111):
```javascript
// Forecast accuracy (simulated - in production this would compare to actuals)
const forecastAccuracy = 92.4;
```

#### Database Requirement

**No new Supabase tables needed.** Use existing tables:
- `forecasts` - ML predictions (outlet_id, sku_id, forecast_date, forecast_value)
- `historical_sales` - Actual sales (outlet_id, sku_id, sale_date, actual_sales)

**Important**: The ML pipeline must preserve past forecasts (only delete/replace future dates, not past ones).

#### How to Calculate

**MAPE (Mean Absolute Percentage Error)**:
```
MAPE = (1/n) × Σ |Actual - Predicted| / Actual × 100
Accuracy = 100 - MAPE
```

**SQL Query** (join forecasts with actuals):
```sql
SELECT
  f.forecast_date,
  f.sku_id,
  f.outlet_id,
  f.forecast_value as predicted,
  h.actual_sales as actual,
  CASE WHEN h.actual_sales > 0
    THEN ABS(h.actual_sales - f.forecast_value)::float / h.actual_sales * 100
    ELSE NULL  -- Exclude zero actuals
  END as percentage_error
FROM forecasts f
JOIN historical_sales h
  ON f.organization_id = h.organization_id
  AND f.outlet_id = h.outlet_id
  AND f.sku_id = h.sku_id
  AND f.forecast_date = h.sale_date
WHERE f.forecast_date < CURRENT_DATE
  AND f.forecast_date >= CURRENT_DATE - INTERVAL '30 days'
```

#### Time Window

Uses the **existing date range filter** (7/14/30/60/90 days) from the dashboard. When user selects "30 Days", both the forecast chart AND the accuracy KPI reflect the same period.

#### Edge Cases

| Scenario | Behavior |
|----------|----------|
| No actuals yet | Show "N/A" with subtitle "Awaiting sales data" |
| Zero actual sales | Exclude from MAPE calculation (avoid division by zero) |
| Partial data | Calculate based on available data, show "(X days)" in subtitle |

#### Execution Plan

| Step | Task | Details |
|------|------|---------|
| 1 | Update ML pipeline | Ensure it preserves past forecasts (only upserts future dates) |
| 2 | Add accuracy hook | Create `useAccuracyData()` in `src/lib/hooks/useForecastData.ts` |
| 3 | Update dashboard | Replace hardcoded `92.4` with real MAPE calculation |
| 4 | Handle empty state | Show "N/A" when no comparison data exists |

### Part B: Full Accuracy Dashboard (Later)

**What**: A dedicated page for deep-diving into forecast performance.

**Metrics to Display**:
- **MAPE** (Mean Absolute Percentage Error) - overall accuracy
- **Bias** - is the model over or under-predicting?
- **Accuracy by SKU** - which products are hardest to predict?
- **Accuracy by Outlet** - which locations have more variance?
- **Accuracy by Day of Week** - weekends harder than weekdays?

**Execution Plan**:

| Step | Task | Details |
|------|------|---------|
| 1 | Create accuracy table | Store MAPE, bias by SKU/outlet/date |
| 2 | Build dashboard page | New page: `/dashboard/accuracy` |
| 3 | Add visualizations | Charts showing accuracy over time |
| 4 | Add drill-down | Click on SKU to see its accuracy history |
| 5 | Add to navigation | Under "Analysis" section |

**Dependencies**:
- ML pipeline generating forecasts
- Actual sales data flowing in daily
- At least 30 days of forecasts to analyze

**Estimated Effort**: Part A: Small | Part B: Medium

---

## 5. Automated Alerts & Notifications

**Status**: Future consideration

**Description**:
Proactively notify users about important forecast-related events via email or in-app notifications.

**Alert Types**:

| Alert | Trigger | Priority |
|-------|---------|----------|
| Demand spike detected | Forecast 50%+ above normal | High |
| Low inventory risk | Forecast exceeds typical stock levels | High |
| Forecast accuracy dropping | MAPE increases significantly | Medium |
| New event overlap | Two events on same dates | Low |
| Pipeline failure | ML run didn't complete | Critical |

**Execution Plan**:

| Step | Task | Details |
|------|------|---------|
| 1 | Design notification system | In-app notifications table, email service |
| 2 | Define alert rules | Configurable thresholds per customer |
| 3 | Build detection logic | Run after each forecast generation |
| 4 | Create notification UI | Bell icon in header, notification panel |
| 5 | Set up email service | SendGrid, Resend, or similar |
| 6 | Add user preferences | Let users choose which alerts they want |

**Dependencies**:
- ML pipeline stable
- Accuracy tracking in place
- Email service configured

**Estimated Effort**: Large

---

## 6. Security Enhancement - Phase 3 (Medium Priority)

**Status**: Planned (after Phase 1 & 2 complete)

**Description**:
Medium priority security enhancements to further harden the application for enterprise deployment.

**Improvements Included**:
1. **Server-side forecast calculations** - Move forecast adjustments from client to Postgres functions
2. **Password security configuration** - Enable leaked password protection, reduce OTP expiry
3. **Foreign key indexes** - Add 10 missing indexes for performance and DoS prevention
4. **RLS policy consolidation** - Combine duplicate policies for better query performance
5. **Comprehensive audit logging** - Track all data mutations with audit trail
6. **Error message sanitization** - Remove information leakage from error responses
7. **Security headers** - Add CSP, X-Frame-Options, HSTS, etc.

**Execution Plan**:

| Step | Task | Effort |
|------|------|--------|
| 1 | Create Postgres function for forecast calculations | 6 hours |
| 2 | Update Supabase Auth settings (OTP, leaked passwords) | 30 min |
| 3 | Add 10 foreign key indexes | 1 hour |
| 4 | Combine duplicate RLS policies (users, cannibalization tables) | 2 hours |
| 5 | Create audit_log table and triggers for events/SKUs/categories | 6 hours |
| 6 | Sanitize error messages in admin-invite API | 2 hours |
| 7 | Add security headers in next.config.ts | 1 hour |

**Security Headers to Add**:
```typescript
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'
```

**Database Changes**:
- Create `audit_log` table with triggers on events, skus, categories tables
- Create `calculate_final_forecast()` Postgres function
- Add indexes: idx_cannibalization_source, idx_forecasts_outlet, etc. (10 total)
- Drop unused index: idx_forecasts_lookup

**Dependencies**:
- Phase 1 and Phase 2 complete
- Testing environment for verification

**Estimated Effort**: 2.5 days

---

## 7. Security Enhancement - Phase 4 (Low Priority)

**Status**: Planned (nice-to-have improvements)

**Description**:
Final polish and security best practices for production readiness.

**Improvements Included**:
1. **Drop unused indexes** - Clean up idx_forecasts_lookup
2. **Password complexity requirements** - Enforce 12+ chars, uppercase, numbers, symbols
3. **Request ID tracking** - Generate unique IDs for all API requests for log correlation
4. **Penetration testing** - Professional security audit

**Execution Plan**:

| Step | Task | Effort |
|------|------|--------|
| 1 | Drop unused index from forecasts table | 15 min |
| 2 | Add password complexity validation to onboard page | 1 hour |
| 3 | Add request ID middleware for all API routes | 1 hour |
| 4 | Conduct penetration testing and security review | 1 day |

**Password Complexity Schema**:
```typescript
z.string()
  .min(12)
  .regex(/[A-Z]/, "Must contain uppercase")
  .regex(/[a-z]/, "Must contain lowercase")
  .regex(/[0-9]/, "Must contain number")
  .regex(/[^A-Za-z0-9]/, "Must contain special character")
```

**Request ID Implementation**:
- Add UUID generation in middleware.ts
- Include X-Request-ID header in all responses
- Log request IDs in all API operations
- Correlate logs across services

**Security Review Checklist**:
- [ ] Multi-tenant isolation verified
- [ ] Authentication bypass attempts blocked
- [ ] Rate limiting tested
- [ ] Input validation comprehensive
- [ ] SQL injection attempts fail
- [ ] XSS attempts sanitized
- [ ] CSRF protection working
- [ ] Security headers present

**Dependencies**:
- All previous phases complete
- Production-like test environment

**Estimated Effort**: 1.5 days

---

## Backlog (Ideas for Later)

These are not yet planned but may be valuable:

| Feature | Description |
|---------|-------------|
| **Multi-model ensemble** | Combine predictions from multiple models for better accuracy |
| **Promotion optimizer** | Suggest optimal discount % based on predicted demand elasticity |
| **Supplier integration** | Auto-generate purchase orders based on forecasts |
| **Mobile app** | View forecasts on phone |
| **Slack/Teams integration** | Daily forecast summary in chat |
| **What-if scenarios** | "What if we run a 20% promo?" simulation |

---

## How to Use This Document

1. **Adding a new feature**: Create a new section with Status, Description, Execution Plan, Dependencies, and Estimated Effort
2. **Updating status**: Change status as features move from Planned → In Progress → Completed
3. **Prioritizing**: Discuss with founder to reorder based on business needs

---

*Document created: December 2024*
*Last updated: December 2024*

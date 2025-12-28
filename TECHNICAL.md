# Technical Documentation: LemonDots AI

> This document is for developers. It explains how the web application works and how it connects to the Supabase backend.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [Data Flow](#data-flow)
5. [Application Structure](#application-structure)
6. [Role-Based Access Control](#role-based-access-control)
7. [Core Business Logic](#core-business-logic)
8. [React Query Data Fetching](#react-query-data-fetching)
9. [Supabase Integration](#supabase-integration)
10. [Key Features Implementation](#key-features-implementation)
11. [Environment Setup](#environment-setup)

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14+ | React framework with App Router |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| Shadcn/ui | Latest | UI component library |
| Chart.js | 4.x | Data visualization |
| React Query | 5.x | Server state management |
| SheetJS (xlsx) | Latest | Excel export functionality |

### Backend
| Technology | Purpose |
|------------|---------|
| Supabase | PostgreSQL database, authentication, RLS |
| Supabase Auth | User authentication (email/password) |
| Row-Level Security | Multi-tenant data isolation |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Next.js App Router                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │  Dashboard  │  │   Events    │  │   SKU Settings  │   │  │
│  │  │    Page     │  │   Manager   │  │      Page       │   │  │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘   │  │
│  │         │                │                   │            │  │
│  │         └────────────────┼───────────────────┘            │  │
│  │                          │                                │  │
│  │              ┌───────────▼───────────┐                    │  │
│  │              │    React Query        │                    │  │
│  │              │  (useDashboardData)   │                    │  │
│  │              └───────────┬───────────┘                    │  │
│  │                          │                                │  │
│  │              ┌───────────▼───────────┐                    │  │
│  │              │   Supabase Client     │                    │  │
│  │              │  (@supabase/ssr)      │                    │  │
│  └──────────────┴───────────┬───────────┴────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTPS
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                      SUPABASE BACKEND                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   PostgreSQL Database                      │  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ outlets  │  │   skus   │  │  events  │  │forecasts │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐  │  │
│  │  │categories│  │historical_   │  │ cannibalization_   │  │  │
│  │  │          │  │   sales      │  │     impacts        │  │  │
│  │  └──────────┘  └──────────────┘  └────────────────────┘  │  │
│  │                                                            │  │
│  │  Row-Level Security (RLS) enforces organization isolation  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Supabase Auth                            │  │
│  │           (JWT tokens, user sessions)                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              ▲
                              │ (Separate process - not in this app)
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                    ML PIPELINE (External)                        │
│  Reads customer data → Generates forecasts → Writes to Supabase │
└──────────────────────────────────────────────────────────────────┘
```

### Key Points

1. **This web app does NOT generate forecasts** - ML predictions are created by a separate pipeline and stored in the `forecasts` table
2. **All business logic runs client-side** - Calculations like uplift, min quantity, and revenue happen in the browser
3. **Supabase is the single source of truth** - All data is stored in PostgreSQL
4. **Multi-tenancy via RLS** - Each organization can only see their own data

---

## Database Schema

### Entity Relationship Diagram

```
organizations (1) ──────┬──── (many) outlets
                        │
                        ├──── (many) categories ──── (many) skus
                        │                               │
                        │                               ├── cannibalization_impacts
                        │                               │
                        ├──── (many) events ────────────┤
                        │                               │
                        ├──── (many) forecasts ─────────┤
                        │                               │
                        └──── (many) historical_sales ──┘

users ──── (belongs to) ──── organizations
```

### Tables Detail

#### `organizations`
```sql
id              UUID PRIMARY KEY
name            TEXT
```
Root entity for multi-tenancy. All other tables reference this.

#### `users`
```sql
id              UUID PRIMARY KEY (references auth.users)
org_id          UUID REFERENCES organizations(id)
org_name        TEXT
email           TEXT
name            TEXT
role            TEXT ('admin' | 'viewer')
created_at      TIMESTAMP
```
Links Supabase Auth users to organizations.

**Role Values:**
- `admin`: Full access to all features including configuration and user management
- `viewer`: Read-only access to forecasting pages (no configuration access)

#### `outlets`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID REFERENCES organizations(id)
name            TEXT
city            TEXT ('Bangalore' | 'Mumbai' | 'Delhi' | 'Hyderabad')
format          TEXT ('Airport' | 'Kiosk' | 'Cafe' | 'Cloud Kitchen')
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```
Physical or virtual locations where products are sold.

#### `categories`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID REFERENCES organizations(id)
name            TEXT
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```
Product groupings (e.g., "Milk Chocolate", "Dark Chocolate").

#### `skus`
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id     UUID REFERENCES organizations(id)
category_id         UUID REFERENCES categories(id) NULLABLE
name                TEXT
min_quantity        INTEGER DEFAULT 0
avg_forecast        INTEGER DEFAULT 0
price_per_unit      NUMERIC DEFAULT 0
is_new_product      BOOLEAN DEFAULT false
reference_sku_id    UUID REFERENCES skus(id) NULLABLE
similarity_factor   NUMERIC DEFAULT 1.0
active_period_start DATE NULLABLE
active_period_end   DATE NULLABLE
created_at          TIMESTAMPTZ DEFAULT now()
updated_at          TIMESTAMPTZ DEFAULT now()
```
Stock Keeping Units - individual products.

**Key Fields:**
- `min_quantity`: Floor value for forecasts (user override)
- `price_per_unit`: Used to calculate revenue (₹)
- `is_new_product`: Marks products added via "Add New Product" feature
- `reference_sku_id` + `similarity_factor`: For new product forecasting

#### `events`
```sql
id                       UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id          UUID REFERENCES organizations(id)
name                     TEXT
type                     TEXT CHECK (type IN ('holiday', 'promo', 'custom'))
start_date               DATE
end_date                 DATE
scope_outlet_id          UUID REFERENCES outlets(id) NULLABLE
scope_category_id        UUID REFERENCES categories(id) NULLABLE
scope_sku_id             UUID REFERENCES skus(id) NULLABLE
mode                     TEXT DEFAULT 'flag' CHECK (mode IN ('flag', 'uplift'))
uplift_pct               INTEGER DEFAULT 0
enabled                  BOOLEAN DEFAULT true
comparison_method        TEXT DEFAULT 'calendar' CHECK (comparison_method IN ('calendar', 'same_event'))
historical_ly_start_date DATE NULLABLE
historical_ly_end_date   DATE NULLABLE
historical_ly2_start_date DATE NULLABLE
historical_ly2_end_date  DATE NULLABLE
created_at               TIMESTAMPTZ DEFAULT now()
updated_at               TIMESTAMPTZ DEFAULT now()
```

**Event Modes:**
- `flag`: Marks dates for ML model training (input to ML)
- `uplift`: Applies percentage increase to forecasts (output adjustment)

**Scope Fields (null = applies to all):**
- `scope_outlet_id`: Limit to specific outlet
- `scope_category_id`: Limit to specific category
- `scope_sku_id`: Limit to specific SKU

**Comparison Method (for Event Analysis):**
- `calendar`: Compare to same calendar dates last year
- `same_event`: Compare to when this event occurred last year (uses historical_ly_* fields)

#### `forecasts`
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id   UUID REFERENCES organizations(id)
outlet_id         UUID REFERENCES outlets(id)
sku_id            UUID REFERENCES skus(id)
forecast_date     DATE
forecast_value    INTEGER
lower_bound       INTEGER NULLABLE
upper_bound       INTEGER NULLABLE
confidence_rating TEXT CHECK (confidence_rating IN ('high', 'medium', 'low'))
created_at        TIMESTAMPTZ DEFAULT now()
updated_at        TIMESTAMPTZ DEFAULT now()
```
**Populated by external ML pipeline, not by this web app.**

Each row = one prediction for one SKU at one outlet on one date.

#### `historical_sales`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID REFERENCES organizations(id)
outlet_id       UUID REFERENCES outlets(id)
sku_id          UUID REFERENCES skus(id)
sale_date       DATE
actual_sales    INTEGER
revenue         NUMERIC NULLABLE
created_at      TIMESTAMPTZ DEFAULT now()
```
Past sales data for year-over-year comparisons.

#### `cannibalization_impacts`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
source_sku_id   UUID REFERENCES skus(id)  -- the new product
affected_sku_id UUID REFERENCES skus(id)  -- product losing sales
percentage      NUMERIC
created_at      TIMESTAMPTZ DEFAULT now()
```
Defines how new products affect existing product sales.

---

## Data Flow

### 1. Forecast Display Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│  ML Pipeline│────▶│  forecasts  │────▶│   Web App Reads     │
│  (external) │     │   table     │     │   via React Query   │
└─────────────┘     └─────────────┘     └──────────┬──────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │  Apply Adjustments  │
                                        │  (client-side)      │
                                        │                     │
                                        │  1. Event uplift    │
                                        │  2. Min quantity    │
                                        │  3. Revenue calc    │
                                        └──────────┬──────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │   Display in UI     │
                                        │   (Chart + Table)   │
                                        └─────────────────────┘
```

### 2. Event Creation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   User      │────▶│  Event      │────▶│  events table       │
│   creates   │     │  Manager    │     │  (Supabase)         │
│   event     │     │  Modal      │     │                     │
└─────────────┘     └─────────────┘     └──────────┬──────────┘
                                                   │
                         ┌─────────────────────────┴─────────────────────────┐
                         │                                                   │
                         ▼                                                   ▼
              ┌─────────────────────┐                          ┌─────────────────────┐
              │  mode = 'flag'      │                          │  mode = 'uplift'    │
              │                     │                          │                     │
              │  Used by ML model   │                          │  Applied in UI to   │
              │  as training data   │                          │  modify displayed   │
              │  (SpecialEvents)    │                          │  forecasts          │
              └─────────────────────┘                          └─────────────────────┘
```

### 3. SKU Settings Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   User      │────▶│  SKU        │────▶│  skus table         │
│   updates   │     │  Settings   │     │  (min_quantity,     │
│   SKU       │     │  Page       │     │   category_id)      │
└─────────────┘     └─────────────┘     └──────────┬──────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │  Next forecast      │
                                        │  display uses new   │
                                        │  min_quantity       │
                                        └─────────────────────┘
```

---

## Application Structure

```
src/
├── app/
│   ├── (auth)/                    # Authentication pages (grouped route)
│   │   ├── layout.tsx             # Auth layout (no sidebar)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── update-password/page.tsx
│   │
│   ├── dashboard/                 # Main application
│   │   ├── layout.tsx             # Dashboard layout (with sidebar)
│   │   ├── page.tsx               # Demand Forecast (default)
│   │   ├── daily/page.tsx         # Daily Forecast Detail
│   │   ├── events/page.tsx        # Event Manager (admin only)
│   │   ├── event-analysis/page.tsx # Event Analysis
│   │   ├── profile/page.tsx       # Profile & Team Management
│   │   └── sku-settings/page.tsx  # SKU Settings (admin only)
│   │
│   ├── api/                       # API routes (server-side)
│   │   ├── admin-invite/route.ts  # Invite new users
│   │   └── admin-delete-user/route.ts
│   │
│   ├── onboard/page.tsx           # New user onboarding
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing/redirect
│   └── globals.css                # Global styles + Tailwind
│
├── components/
│   ├── ui/                        # Shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── select.tsx
│   │   └── ... (40+ components)
│   │
│   ├── dashboard/                 # Dashboard-specific components
│   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   ├── Header.tsx             # Top header bar
│   │   ├── KPICard.tsx            # KPI display cards
│   │   └── ForecastChart.tsx      # Chart.js line chart
│   │
│   ├── SupabaseProvider.tsx       # Supabase context provider
│   └── QueryProvider.tsx          # React Query provider
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client
│   │   ├── admin.ts               # Server-side admin client
│   │   └── useAuth.tsx            # Auth hook
│   │
│   ├── hooks/
│   │   ├── useForecastData.ts     # Data fetching hooks
│   │   ├── useEventMutations.ts   # Event CRUD mutations
│   │   └── useSKUMutations.ts     # SKU/Category mutations
│   │
│   ├── types.ts                   # TypeScript interfaces
│   ├── forecast-utils.ts          # Business logic utilities
│   └── logger.ts                  # Logging utility
│
└── styles/
    └── (included in globals.css)
```

---

## Role-Based Access Control

### User Roles

The application supports two user roles:

| Role | Description |
|------|-------------|
| `admin` | Full access to all features, including configuration and user management |
| `viewer` | Read-only access to forecasting pages only |

### Access Matrix

| Page | Admin | Viewer |
|------|-------|--------|
| Demand Forecast | ✅ | ✅ |
| Daily Forecast Detail | ✅ | ✅ |
| Event Analysis | ✅ | ✅ |
| SKU Settings | ✅ | ❌ |
| Event Manager | ✅ | ❌ |
| Profile Settings | ✅ (with team management) | ✅ (view only) |

### Implementation

#### Sidebar Visibility

**File:** `src/components/dashboard/Sidebar.tsx`

The Configuration section (SKU Settings, Event Manager) is conditionally rendered based on user role:

```typescript
const [userRole, setUserRole] = useState<string | null>(null);

useEffect(() => {
  async function fetchUserProfile() {
    const { data } = await supabase
      .from('users')
      .select('name, email, role')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setUserRole(data.role);
    }
  }
  fetchUserProfile();
}, [user, supabase]);

const isAdmin = userRole === 'admin';

// In render:
{isAdmin && (
  <div className="mb-6">
    <h3>Configuration</h3>
    {/* SKU Settings and Event Manager links */}
  </div>
)}
```

#### Route Protection

Admin-only pages (`events/page.tsx`, `sku-settings/page.tsx`) include route protection:

```typescript
// Check admin access on mount
useEffect(() => {
  async function checkAdminAccess() {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (data?.role === 'admin') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
      toast.error('Access denied. Admin privileges required.');
      router.push('/dashboard');
    }
  }
  checkAdminAccess();
}, [user, supabase, router]);

// Show access denied if not admin
if (!isAdmin) {
  return <AccessDeniedCard />;
}
```

### Profile & Team Management

**File:** `src/app/dashboard/profile/page.tsx`

**All Users Can:**
- View their profile information (name, email, organization, role)
- Sign out

**Admin Users Can Additionally:**
- View all team members in their organization
- Invite new users via email
- Set role (admin or viewer) for new users
- Remove users from the organization

### User Invitation Flow

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│   Admin     │────▶│  Profile Page   │────▶│  POST /api/         │
│   clicks    │     │  Invite Modal   │     │  admin-invite       │
│   "Invite"  │     │                 │     │                     │
└─────────────┘     └─────────────────┘     └──────────┬──────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────┐
                                            │  Supabase Auth      │
                                            │  inviteUserByEmail  │
                                            │  (sends email)      │
                                            └──────────┬──────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────┐
                                            │  New user clicks    │
                                            │  email link →       │
                                            │  sets password      │
                                            └─────────────────────┘
```

### User Deletion Flow

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│   Admin     │────▶│  Confirm email  │────▶│  DELETE /api/       │
│   clicks    │     │  (type to       │     │  admin-delete-user  │
│   "Remove"  │     │   confirm)      │     │                     │
└─────────────┘     └─────────────────┘     └──────────┬──────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────┐
                                            │  1. Delete from     │
                                            │     public.users    │
                                            │  2. Delete from     │
                                            │     auth.users      │
                                            └─────────────────────┘
```

---

## Core Business Logic

### Location: `src/lib/forecast-utils.ts`

### 1. Event Applicability Check

```typescript
function getApplicableEvents(
  events: Event[],
  date: string,
  outletId: string,
  categoryId: string | null,
  skuId: string
): Event[]
```

Determines which events apply to a specific forecast row:
1. Event must be `enabled`
2. Date must be within event's `start_date` → `end_date`
3. Scope must match (or be null for "all"):
   - `scope_outlet_id` matches or is null
   - `scope_category_id` matches or is null
   - `scope_sku_id` matches or is null

### 2. Uplift Calculation

```typescript
function calculateEventUpliftMultiplier(events: Event[]): number
```

- Filters to events with `mode === 'uplift'` and `uplift_pct > 0`
- Returns `1 + (maxUplift / 100)`
- **Multiple overlapping events: takes the MAX uplift, not cumulative**

Example:
- Event A: +30% uplift
- Event B: +50% uplift
- Result: 1.50 multiplier (not 1.80)

### 3. Final Forecast Calculation

```typescript
function calculateFinalForecast(
  rawForecast: number,
  events: Event[],
  minQuantity: number
): { finalForecast: number; isOverridden: boolean; upliftApplied: boolean }
```

Order of operations:
1. **Start with raw ML forecast**
2. **Apply event uplift multiplier**
3. **Apply minimum quantity floor** (if forecast < min_quantity, use min_quantity)

```typescript
// Pseudocode
let forecast = rawForecast * upliftMultiplier;
forecast = Math.max(forecast, minQuantity);
return Math.round(forecast);
```

### 4. Revenue Calculation

```typescript
revenue = finalForecast * sku.price_per_unit
```

Revenue is calculated client-side using the SKU's `price_per_unit` field.

### 5. Confidence Rating

```typescript
function calculateConfidenceRating(
  forecast: number,
  lowerBound: number,
  upperBound: number
): 'high' | 'medium' | 'low'
```

Based on the width of the confidence interval:
- `high`: range < 24% of forecast
- `medium`: range < 36% of forecast
- `low`: range >= 36% of forecast

---

## React Query Data Fetching

### Location: `src/lib/hooks/useForecastData.ts`

### Main Hook: `useDashboardData(days: number)`

Combines all data fetching into a single hook:

```typescript
const {
  outlets,        // Outlet[]
  categories,     // Category[]
  skus,           // SKU[]
  events,         // Event[]
  forecasts,      // Forecast[]
  historicalLY,   // HistoricalSale[] (last year)
  historicalLY2,  // HistoricalSale[] (2 years ago)
  isLoading,
  error,
  refetch,
} = useDashboardData(30);
```

### Individual Hooks

| Hook | Query Key | Data |
|------|-----------|------|
| `useOutlets()` | `['outlets', userId]` | All outlets |
| `useCategories()` | `['categories', userId]` | All categories |
| `useSKUs()` | `['skus', userId]` | SKUs with joined category |
| `useEvents()` | `['events', userId]` | Events with joined scopes |
| `useForecasts(days)` | `['forecasts', userId, days]` | Forecasts for next N days |
| `useHistoricalSales(days)` | `['historical_sales', userId, days]` | LY + LY-1 sales |

### Query Invalidation

Mutations automatically invalidate related queries:

```typescript
// After creating/updating an event:
queryClient.invalidateQueries({ queryKey: ['events'] });
queryClient.invalidateQueries({ queryKey: ['forecasts'] });

// After updating a SKU:
queryClient.invalidateQueries({ queryKey: ['skus'] });
queryClient.invalidateQueries({ queryKey: ['forecasts'] });
```

---

## Supabase Integration

### Client Setup

**Browser Client** (`src/lib/supabase/client.ts`):
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Context Provider** (`src/components/SupabaseProvider.tsx`):
```typescript
// Provides Supabase client via React context
const supabase = useSupabase();
```

### Row-Level Security (RLS)

All tables have RLS enabled. Policies ensure:
- Users can only read/write data for their organization
- Policies check `organization_id` against user's `org_id`

Example policy pattern:
```sql
CREATE POLICY "Users can view their org's outlets"
ON outlets FOR SELECT
USING (organization_id = (
  SELECT org_id FROM users WHERE id = auth.uid()
));
```

### Query Patterns

**Select with joins:**
```typescript
const { data, error } = await supabase
  .from('skus')
  .select(`
    *,
    category:categories(*)
  `)
  .order('name', { ascending: true });
```

**Insert:**
```typescript
const { data, error } = await supabase
  .from('events')
  .insert({
    organization_id: orgId,
    name: 'Diwali 2025',
    type: 'holiday',
    start_date: '2025-10-20',
    end_date: '2025-10-24',
    mode: 'uplift',
    uplift_pct: 45,
  })
  .select()
  .single();
```

**Update:**
```typescript
const { data, error } = await supabase
  .from('skus')
  .update({ min_quantity: 100 })
  .eq('id', skuId)
  .select()
  .single();
```

**Delete:**
```typescript
const { error } = await supabase
  .from('events')
  .delete()
  .eq('id', eventId);
```

---

## Key Features Implementation

### 1. Demand Forecast Chart

**File:** `src/components/dashboard/ForecastChart.tsx`

**Features:**
- Line chart with Chart.js
- Shows ML Forecast (dashed gray) and Forecast + Uplift (solid green)
- Confidence bands (shaded area)
- Historical comparison lines (LY, LY-1)
- Event bands (colored rectangles for event periods)

**Data Processing:**
1. Aggregate forecasts by date
2. Calculate uplift for each date
3. Map historical sales to corresponding forecast dates
4. Generate event band positions

### 2. Daily Forecast Table

**File:** `src/app/dashboard/daily/page.tsx`

**Features:**
- Sortable columns
- Filters: date range, category, outlet, SKU, search
- Shows raw vs final forecast
- Badges for min quantity overrides and events
- Excel export via SheetJS

### 3. Event Manager

**File:** `src/app/dashboard/events/page.tsx`

**Features:**
- CRUD for events
- Event types: holiday, promo, custom
- Event modes: flag (ML input), uplift (output adjustment)
- Scope selection: outlet, category, SKU
- Comparison method for Event Analysis
- Enable/disable toggle

### 4. Event Analysis

**File:** `src/app/dashboard/event-analysis/page.tsx`

**Features:**
- Filter by event
- Group by: City, Category, Format, Date
- Shows: Current Forecast, Actuals LY, Actuals LY-1
- Percentage change calculations
- Supports "Same Event" comparison for shifting dates

### 5. SKU Settings

**File:** `src/app/dashboard/sku-settings/page.tsx`

**Features:**
- Set minimum quantity per SKU
- Assign categories to SKUs
- Create/delete categories
- Category deletion auto-uncategorizes SKUs
- **Admin-only access** with route protection

### 6. Profile & Team Management

**File:** `src/app/dashboard/profile/page.tsx`

**Features:**
- Display user profile information
- Role badge (Admin with crown icon, Viewer with eye icon)
- **Admin-only:** Team members table
- **Admin-only:** Invite new users modal
- **Admin-only:** Remove users with email confirmation
- Refresh team list

**API Routes:**
- `POST /api/admin-invite` - Send invitation email
- `DELETE /api/admin-delete-user` - Remove user from organization

**Security:**
- JWT token validation
- Admin role verification (both JWT and database)
- Organization isolation (can only manage users in same org)
- Self-deletion prevention
- Email confirmation required for deletion

---

## Environment Setup

### Required Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# For server-side admin operations (API routes)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Database Migrations

Migrations are managed via Supabase MCP or dashboard:

| Version | Name | Description |
|---------|------|-------------|
| 20251227122325 | create_demand_forecasting_tables | Initial schema |
| 20251227142339 | add_event_comparison_method | Comparison method fields |
| 20251227143854 | remove_unimplemented_comparison_methods | Clean up options |

---

## Appendix: TypeScript Types

### Core Entity Types

```typescript
interface Outlet {
  id: string;
  organization_id: string;
  name: string;
  city: string;
  format: 'Airport' | 'Kiosk' | 'Cafe' | 'Cloud Kitchen';
}

interface Category {
  id: string;
  organization_id: string;
  name: string;
}

interface SKU {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  min_quantity: number;
  avg_forecast: number;
  price_per_unit: number;
  is_new_product: boolean;
  reference_sku_id: string | null;
  similarity_factor: number;
  active_period_start: string | null;
  active_period_end: string | null;
}

interface Event {
  id: string;
  organization_id: string;
  name: string;
  type: 'holiday' | 'promo' | 'custom';
  start_date: string;
  end_date: string;
  scope_outlet_id: string | null;
  scope_category_id: string | null;
  scope_sku_id: string | null;
  mode: 'flag' | 'uplift';
  uplift_pct: number;
  enabled: boolean;
  comparison_method: 'calendar' | 'same_event';
  historical_ly_start_date: string | null;
  historical_ly_end_date: string | null;
  historical_ly2_start_date: string | null;
  historical_ly2_end_date: string | null;
}

interface Forecast {
  id: string;
  organization_id: string;
  outlet_id: string;
  sku_id: string;
  forecast_date: string;
  forecast_value: number;
  lower_bound: number | null;
  upper_bound: number | null;
  confidence_rating: 'high' | 'medium' | 'low' | null;
}

interface HistoricalSale {
  id: string;
  organization_id: string;
  outlet_id: string;
  sku_id: string;
  sale_date: string;
  actual_sales: number;
  revenue: number | null;
}
```

---

## Common Patterns & Gotchas

### AlertDialog with Complex Content

Shadcn's `AlertDialogDescription` renders as a `<p>` element. When you need complex content (multiple paragraphs, form inputs), use `asChild` to avoid HTML nesting errors:

```tsx
// ❌ Wrong - causes hydration errors
<AlertDialogDescription>
  <p>First paragraph</p>
  <div>Some content</div>
</AlertDialogDescription>

// ✅ Correct - use asChild
<AlertDialogDescription asChild>
  <div className="space-y-3">
    <p>First paragraph</p>
    <div>Some content</div>
  </div>
</AlertDialogDescription>
```

### Chart.js Tooltip Null Checks

When using Chart.js tooltips with TypeScript, always add null checks for parsed values:

```typescript
// ❌ Wrong - TypeScript error on build
label: (context) => {
  return `${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
}

// ✅ Correct - handle null case
label: (context) => {
  const value = context.parsed.y;
  return `${context.dataset.label}: ${value !== null ? value.toLocaleString() : '0'}`;
}
```

---

*Last updated: December 2024*

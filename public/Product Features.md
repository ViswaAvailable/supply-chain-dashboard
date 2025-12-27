# LemonDots AI - Demand Forecasting Platform

## Product Overview

LemonDots AI is a **Demand Planning and Forecasting tool** designed for FMCG/Retail companies (specifically demonstrated for a chocolate company in India). It uses Machine Learning to help Supply Chain leaders and Demand Planning teams accurately forecast demand by combining historical data with "Event-Aware" intelligence.

**Target Users:** Demand Planners, Supply Chain Managers, Category Managers

**Demo Context:** Chocolate company with outlets across Bangalore, Mumbai, Delhi, and Hyderabad operating through Airports, Kiosks, Cafes, and Cloud Kitchens.

---

## Application Architecture

### Navigation Structure

```
┌─────────────────────────────────────────────────────────────┐
│  LemonDots AI (Header with Logo)                            │
├──────────────┬──────────────────────────────────────────────┤
│  SIDEBAR     │  MAIN CONTENT AREA                           │
│              │                                              │
│  FORECASTING │  [Active Page Content]                       │
│  • Demand    │                                              │
│    Forecast  │                                              │
│  • Daily     │                                              │
│    Forecast  │                                              │
│    Detail    │                                              │
│  • Event     │                                              │
│    Analysis  │                                              │
│              │                                              │
│  CONFIG      │                                              │
│  • SKU       │                                              │
│    Settings  │                                              │
│  • Event     │                                              │
│    Manager   │                                              │
│              │                                              │
│  [Profile]   │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

---

## Data Model

### 1. Outlets
Each outlet has:
- `id`: Unique identifier (e.g., `blr-airport-t1`)
- `name`: Display name (e.g., "Bangalore Airport T1")
- `city`: City location (Bangalore, Mumbai, Delhi, Hyderabad)
- `format`: Outlet type (Airport, Kiosk, Cafe, Cloud Kitchen)

**Demo Outlets:**
| ID | Name | City | Format |
|----|------|------|--------|
| blr-airport-t1 | Bangalore Airport T1 | Bangalore | Airport |
| mum-phoenix-kiosk | Phoenix Mall Kiosk | Mumbai | Kiosk |
| del-cp-cafe | Connaught Place Cafe | Delhi | Cafe |
| blr-cloud-kitchen | Koramangala Cloud Kitchen | Bangalore | Cloud Kitchen |
| hyd-gvk-kiosk | GVK One Kiosk | Hyderabad | Kiosk |

### 2. Categories
Product categories for organizing SKUs:
- Milk Chocolate
- Dark Chocolate
- Gift Boxes
- Premium Collection
- Seasonal Specials

**Category Management:**
- Create new categories via "New Category" button
- Delete categories (only if no SKUs assigned)
- Manage categories via "Manage Categories" modal

### 3. SKUs (Stock Keeping Units)
Each SKU has:
- `id`: Unique identifier
- `name`: Product name
- `categoryId`: Reference to category
- `minQuantity`: Minimum order quantity (floor for forecasts)
- `avgForecast`: Average daily forecast baseline
- `pricePerUnit`: Price in INR (₹) for revenue calculations

**New Product Properties (for seasonal/limited products):**
- `isNewProduct`: Boolean flag
- `referenceSku`: Similar product to base forecast on
- `similarityFactor`: Multiplier (0.5 to 1.5) applied to reference SKU's forecast
- `activePeriod`: `{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }` - Product only appears in forecasts within this range
- `cannibalizesFrom`: Array of `{ skuId, percentage }` - Reduces forecast of affected products

### 4. Events
Events represent holidays, promotions, or custom periods:
- `id`: Unique identifier
- `name`: Event name (e.g., "Diwali", "Valentine's Day")
- `type`: `holiday` | `promo` | `custom`
- `startDate` / `endDate`: Event duration
- `scope`: `{ outletId, categoryId, skuId }` - Can target all or specific items
- `mode`: `flag` (display only) | `uplift` (adjust forecast)
- `upliftPct`: Percentage increase (0-300%)
- `enabled`: Boolean to toggle without deleting

**Pre-configured Indian Festivals:**
| Event | Type | Uplift | Default Dates |
|-------|------|--------|---------------|
| Diwali | Holiday | 45% | Oct 28 - Nov 3 |
| Raksha Bandhan | Holiday | 30% | Aug 9 - 12 |
| Valentine's Day | Holiday | 40% | Feb 10 - 15 |
| Holi | Holiday | 25% | Mar 24 - 26 |
| Chocolate Flash Sale | Promotion | 35% | Dec 15 - 27 |

---

## Module 1: Demand Forecast Dashboard

**Purpose:** High-level overview of demand forecasts with YoY comparison

### KPI Cards
| KPI | Description | Calculation |
|-----|-------------|-------------|
| Forecast Accuracy | Model accuracy percentage | ~93-95% (simulated) |
| Forecasted Revenue (30D) | Total revenue for next 30 days | Sum of (forecast × pricePerUnit) |
| Revenue vs LY-1 | Comparison to last year | Percentage variance with color coding |
| Min Qty Overrides | Count of forecasts below minimum | Count where rawForecast < minQuantity |

### Filters
- **SKU Category**: Searchable dropdown with all categories
- **SKU / Final Product**: Searchable dropdown with all products
- **Outlet**: Searchable dropdown with all outlets
- **Date Range**: 7 / 14 / 30 / 60 / 90 days

### Demand Forecast Trend Chart
**Chart Type:** Line chart with confidence bands (Chart.js)

**Data Series:**
1. **Forecasted Demand** (solid dark line with points)
2. **Actual (Last Year)** (dashed blue line) - Toggle via checkbox
3. **Actual (2 Years Ago)** (dotted gray line) - Toggle via checkbox
4. **Confidence Range** (shaded gray band between upper/lower bounds)

**Event Bands:** Shaded vertical regions on chart during event periods with labels

**Interactions:**
- Hover for tooltips showing values
- Toggle historical lines via "Last Year" / "2 Years Ago" checkboxes
- Filters update chart in real-time

---

## Module 2: Daily Forecast Detail

**Purpose:** Granular daily breakdown with sorting, filtering, and export

### Summary Stats
- **Total Forecasted**: Sum of all forecast units
- **Min Qty Overrides**: Count of overridden forecasts
- **Avg Confidence**: Percentage of "High" confidence forecasts

### Filters
Same as Demand Forecast Dashboard plus:
- **Date Range**: Next 7 / 14 / 30 days

### Data Table Columns
| Column | Description | Sortable |
|--------|-------------|----------|
| Outlet | Outlet name | ✓ |
| SKU | Product name (bold) | ✓ |
| Category | Category badge with color | ✓ |
| Events | Event badges if any events apply | ✗ |
| Date | YYYY-MM-DD format | ✓ |
| Day | Day of week (Sunday, Monday, etc.) | ✓ |
| Forecasted Demand | Final forecast (with "⚠ Min Qty" indicator if overridden) | ✓ |
| Lower Bound | Confidence interval lower limit | ✓ |
| Upper Bound | Confidence interval upper limit | ✓ |
| Confidence Rating | Badge: High (green) / Medium (amber) / Low (red) | ✓ |

**Row Highlighting:** Rows with active events have amber background tint

### Export to Excel
Exports filtered data with columns:
- Outlet, SKU, Category, Date, Day
- Forecasted Demand, Lower Bound, Upper Bound
- Confidence Rating, Min Qty Override (Yes/No)
- Events (semicolon-separated), Event Uplift Applied (Yes/No)

---

## Module 3: Event Analysis

**Purpose:** Deep-dive into specific event performance with YoY comparison

### Controls
- **Select Event**: Dropdown of all events
- **Group By**: Dropdown to aggregate by Date (default)

### KPI Cards
| KPI | Value |
|-----|-------|
| Event Revenue | Total forecasted revenue during event period |
| vs Last Year | Percentage variance (green if positive, red if negative) |
| vs 2 Years Ago | Percentage variance |

### Analysis Table
| Column | Description |
|--------|-------------|
| Total | Grouping dimension value |
| Forecasted Revenue | Revenue for current period |
| Revenue vLY | Revenue from last year same period |
| Trend vLY | Percentage change from last year |
| Trend vLY-1 | Percentage change from 2 years ago |

---

## Module 4: SKU Settings

**Purpose:** Configure product settings and manage new product launches

### Filters
- **Category**: Filter SKUs by category
- **Search SKU**: Text search across SKU names

### Action Buttons
- **+ Add New Product**: Opens new product modal
- **+ New Category**: Opens category creation modal
- **Manage Categories**: Opens category management modal
- **Save All Changes**: Persists all edits

### SKU Table Columns
| Column | Description | Editable |
|--------|-------------|----------|
| SKU Name | Product name (bold) | ✗ |
| Category | Dropdown to change category | ✓ |
| Status | "Active" or "New Product" badge | ✗ |
| Minimum Quantity | Number input with "units" label | ✓ |
| Current Avg Forecast | Average forecast in units | ✗ |
| Actions | Edit button | - |

### Minimum Quantity Logic
When the ML forecast for a SKU is **less than** the minimum quantity:
1. The system uses the minimum quantity instead
2. The Daily Forecast table shows "⚠ Min Qty" indicator
3. This ensures production/delivery thresholds are met

### Add New Product Modal

**Fields:**
| Field | Description | Required |
|-------|-------------|----------|
| Select SKU from ERP | Searchable dropdown (simulated ERP integration) | ✓ |
| Minimum Quantity | Floor for forecasts | ✓ |
| Reference SKU | Similar product to base forecast on | ✓ |
| Similarity Factor | Multiplier (0.5-1.5) for reference forecast | ✓ |
| Active Period Start | When product becomes available | Optional |
| Active Period End | When product is discontinued | Optional |
| Cannibalization Impact | Which products lose sales to this new product | Optional |

**Cannibalization Section:**
- Add multiple rows with: SKU dropdown + Percentage input
- Example: "Diwali Special Gift Box takes 15% from Assorted Collection"

**How New Product Forecasting Works:**
1. System finds the Reference SKU's historical/forecast pattern
2. Multiplies by Similarity Factor (e.g., 1.2 = 120% of reference)
3. Only generates forecasts within Active Period
4. Reduces affected SKUs by cannibalization percentage

---

## Module 5: Event Manager

**Purpose:** Define and manage events that affect demand forecasts

### Controls
- **Search Events**: Text search across event names
- **+ Add Event**: Opens event creation modal

### Events Table Columns
| Column | Description | Sortable |
|--------|-------------|----------|
| Event | Event name with colored badge | ✓ |
| Type | HOLIDAY / PROMO / CUSTOM | ✓ |
| Date Range | Start → End dates | ✓ |
| Scope | "All outlets • All categories • All SKUs" or specific | ✓ |
| Uplift | Percentage (or "—" if flag-only) | ✓ |
| Status | Enabled (green) / Disabled (gray) | ✗ |
| Actions | Edit / Enable/Disable / Delete buttons | - |

### Event Types & Visual Styling
| Type | Badge Color | Use Case |
|------|-------------|----------|
| Holiday | Amber/Yellow | Diwali, Valentine's Day, etc. |
| Promo | Blue | Flash sales, discounts |
| Custom | Purple | Company events, local promotions |

### Add/Edit Event Modal

**Fields:**
| Field | Description |
|-------|-------------|
| Event Name | Display name |
| Type | Holiday / Promotion / Custom |
| Start Date | Event begins |
| End Date | Event ends |
| Scope Outlet | All Outlets or specific outlet |
| Scope Category | All Categories or specific category |
| Scope SKU | All SKUs or specific SKU |
| Uplift (%) | Percentage increase (0-300) |
| Mode | "Flag only" (visual) or "Apply uplift" (affects forecast) |

### Event Modes
1. **Flag Only**: Event appears in Daily Forecast table and chart bands, but does NOT modify forecast numbers
2. **Apply Uplift**: Event modifies forecast by uplift percentage

### Uplift Calculation
When multiple events overlap:
- System takes the **maximum uplift** (not compounded)
- Example: If Diwali (45%) and a promo (20%) overlap, only 45% is applied

---

## Technical Implementation Notes

### Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   SKU Data  │────▶│  Generate    │────▶│ Daily Forecasts │
│   + Events  │     │  Forecasts   │     │ Array           │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Apply:       │
                    │ • Event Uplift│
                    │ • Min Qty     │
                    │ • Cannibalization│
                    │ • Confidence  │
                    └──────────────┘
```

### Forecast Generation Algorithm
1. For each day (30-day window):
   - For each outlet:
     - For each SKU:
       1. Get base forecast from `avgForecast`
       2. If new product: Use reference SKU × similarity factor
       3. Apply outlet multiplier (Airport: 1.3x, Kiosk: 1.1x)
       4. Apply day-of-week multiplier (Weekend: 1.2x)
       5. Apply event uplift (max of applicable events)
       6. Apply cannibalization reduction from new products
       7. Calculate confidence bounds (±10-25%)
       8. Apply minimum quantity floor
       9. Calculate revenue (forecast × pricePerUnit)

### Historical Data Generation
- **Last Year (LY)**: Current forecast × 0.88 (simulating 12% YoY growth)
- **2 Years Ago (LY-1)**: Current forecast × 0.76 (simulating compounded growth)
- Applies same event patterns shifted by year

### Revenue Formatting
- Currency: Indian Rupees (₹)
- Format: Indian number system (e.g., ₹1,80,35,060)
- Function: `formatRevenue(amount)` → `'₹' + Math.round(amount).toLocaleString('en-IN')`

### Data Persistence
- Events: Stored in `localStorage` with key `ld_demo_events_v1`
- SKU/Category changes: In-memory only (demo mode)
- Reset: Clearing localStorage restores default events

---

## UI Components

### Searchable Select Dropdown
Custom component for filtering large lists:
- Type to filter options
- Keyboard navigation (↑↓ arrows, Enter to select, Esc to close)
- Highlights matching options
- Shows "No results found" when empty

### Info Tooltips
Hover tooltips explaining:
- Lower/Upper Bound meanings
- Confidence Rating definitions
- Minimum Quantity behavior

### Toast Notifications
Bottom-right notifications for:
- "Settings saved successfully!"
- "Event saved"
- "Event deleted"
- "Exported X records to Excel"

### Category Badges
Color-coded badges by category:
- Milk Chocolate: Amber background
- Dark Chocolate: Blue background
- Gift Boxes: Green background
- Premium Collection: Purple background
- Seasonal Specials: Gray background

### Event Badges
Pill-shaped badges with colored dot:
- Holiday: Amber dot and background
- Promo: Blue dot and background
- Custom: Purple dot and background

---

## Responsive Design

- **Desktop (>1024px)**: Full sidebar (260px) + main content
- **Tablet (768-1024px)**: Narrower sidebar (220px)
- **Mobile (<768px)**: Stacked layout, sidebar becomes horizontal nav

---

## External Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| Chart.js | Latest (CDN) | Line charts with confidence bands |
| SheetJS (xlsx) | 0.20.1 | Excel export functionality |

---

## Future Enhancements (Roadmap)

1. **Real ERP Integration**: Connect to actual ERP for SKU master data
2. **ML Model Integration**: Replace simulated forecasts with actual ML predictions
3. **User Authentication**: Multi-user support with role-based access
4. **Audit Trail**: Track who changed what and when
5. **Alerts & Notifications**: Email/SMS when forecasts deviate significantly
6. **What-If Scenarios**: Simulate different event configurations
7. **Inventory Integration**: Connect forecasts to actual stock levels

---

## Demo Script Highlights

When presenting to clients, emphasize:

1. **YoY Comparison**: Show the Revenue vs LY KPI and historical chart lines
2. **Festival Planning**: Navigate to Event Manager, show Diwali with 45% uplift
3. **New Product Launch**: Open Add New Product modal, explain Reference SKU and Cannibalization
4. **Confidence Intervals**: Show how Lower/Upper bounds help with safety stock planning
5. **Export Capability**: Demonstrate Excel export for ERP integration
6. **Event Flagging**: Show how events appear in Daily Forecast table with badges

---

*Last Updated: December 2024*
*Version: 2.0 (Post India Demo Enhancements)*

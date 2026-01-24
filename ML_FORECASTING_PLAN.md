# ML Forecasting Plan: LemonDots AI

> This document outlines the machine learning approach for demand forecasting. It serves as the reference for all ML development work.

---

## Table of Contents

1. [Business Context](#business-context)
2. [Data Requirements](#data-requirements)
3. [Forecasting Objectives](#forecasting-objectives)
4. [Model Approach](#model-approach)
5. [Feature Engineering](#feature-engineering)
6. [Event Integration](#event-integration)
7. [Confidence Intervals](#confidence-intervals)
8. [New Product Forecasting](#new-product-forecasting)
9. [Pipeline Architecture](#pipeline-architecture)
10. [Output Specification](#output-specification)
11. [Development Phases](#development-phases)

---

## Business Context

### What We're Building

A demand forecasting system for food manufacturing companies (FMCG/Retail) that:
- Predicts daily sales quantities for each product at each outlet
- Incorporates festival and promotional events that spike demand
- Provides confidence bands so users know prediction reliability
- Allows users to fine-tune predictions with uplift percentages

### How It Fits in the Product

```
┌─────────────────┐                         ┌─────────────────────────────────┐
│  Customer ERP   │                         │           SUPABASE              │
│                 │      18:00 daily        │                                 │
│  (source data)  │────────────────────────▶│  ┌─────────────────────────┐   │
└─────────────────┘      Python ETL         │  │    historical_sales     │   │
                                            │  └─────────────────────────┘   │
┌─────────────────┐                         │  ┌─────────────────────────┐   │
│  User (Web App) │────────────────────────▶│  │   events (flags)        │   │
│  Creates Events │     flags & uplifts     │  └─────────────────────────┘   │
└─────────────────┘                         │               │                │
                                            │               ▼                │
                                            │  ┌─────────────────────────┐   │
                                            │  │   ML MODEL (21:00)      │   │
                                            │  │   Reads → Predicts      │   │
                                            │  └─────────────────────────┘   │
                                            │               │                │
                                            │               ▼                │
                                            │  ┌─────────────────────────┐   │
                                            │  │      forecasts          │   │
                                            │  └─────────────────────────┘   │
                                            │               │                │
                                            └───────────────┼────────────────┘
                                                            │
                                                            ▼
                                            ┌─────────────────────────────────┐
                                            │           Web App               │
                                            │   (displays forecasts + uplift) │
                                            └─────────────────────────────────┘
```

### Data Flow Summary

1. **18:00** - Python ETL script pulls data from customer ERP → writes to `historical_sales` in Supabase
2. **Anytime** - Users create/modify events (flags) via the web app → stored in `events` table
3. **21:00** - ML model reads from Supabase (`historical_sales`, `events`, `skus`, `outlets`) → generates predictions → writes to `forecasts` table
4. **Anytime** - Web app displays forecasts, applies user-defined uplifts (post-processing)

The ML pipeline works **entirely within Supabase's ecosystem** - it reads from and writes to the same database.

---

## Data Requirements

### Input Data

| Table | Source | Minimum History |
|-------|--------|-----------------|
| `historical_sales` | Customer ERP | 1.5 years |
| `outlets` | Customer | Current list |
| `skus` | Customer | Current list |
| `events` | User-created in app | As available |
| `categories` | User-assigned in app | As available |

### Data Granularity

- **Temporal**: Daily sales
- **Spatial**: Per SKU, per outlet
- **Expected scale**: ~40 SKUs × ~70 outlets = ~2,800 time series

### Historical Sales Schema

```
historical_sales
├── sale_date (DATE) - the day of sale
├── outlet_id (UUID) - which outlet
├── sku_id (UUID) - which product
├── actual_sales (INTEGER) - units sold
└── revenue (NUMERIC) - optional, for reporting
```

### Minimum Data Quality Requirements

- No gaps longer than 7 consecutive days
- At least 80% of days should have records (zeros are valid)
- Outliers should be flagged or explained by events

---

## Forecasting Objectives

### Forecast Horizons

| Horizon | Use Case | Expected Accuracy |
|---------|----------|-------------------|
| 7 days | Ordering, restocking | High confidence |
| 30 days | Production planning | Medium confidence |
| 90 days | Strategic planning | Lower confidence |

### Output Per Prediction

For each (SKU, Outlet, Date) combination:
- `forecast_value`: Point prediction (expected units)
- `lower_bound`: 10th percentile (pessimistic scenario)
- `upper_bound`: 90th percentile (optimistic scenario)
- `confidence_rating`: 'high', 'medium', or 'low'

---

## Model Approach

### Model Selection Strategy

**We will test multiple models during customer onboarding** and pick the best performer for that customer's data patterns. The pipeline is designed to be model-agnostic.

### Candidate Models to Test

| Model | Strengths | Weaknesses | Best For |
|-------|-----------|------------|----------|
| **LightGBM** | Fast, handles events well, quantile regression | Needs tuning | Complex patterns, many features |
| **XGBoost** | Very accurate, robust | Slower than LightGBM | When accuracy is priority |
| **Prophet** | Good for seasonality, easy to use | Weaker with many features | Strong seasonal patterns |
| **Linear Regression** | Simple, interpretable, fast | May miss complex patterns | Baseline comparison |
| **N-BEATS** | State-of-art time series | Needs more data, slower | Large datasets |

### Model Comparison Process (During Onboarding)

```
┌─────────────────────────────────────────────────────────────────┐
│                  MODEL SELECTION (Onboarding)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
     ┌────────────────────────┼────────────────────────┐
     ▼                        ▼                        ▼
┌──────────┐           ┌──────────┐            ┌──────────┐
│ LightGBM │           │ XGBoost  │            │ Prophet  │  ...
└────┬─────┘           └────┬─────┘            └────┬─────┘
     │                      │                       │
     └──────────────────────┼───────────────────────┘
                            ▼
                   ┌────────────────┐
                   │ Compare MAPE   │
                   │ on holdout set │
                   └────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │ Pick winner    │
                   │ for production │
                   └────────────────┘
```

**Evaluation Metric**: MAPE (Mean Absolute Percentage Error) on a holdout period (last 30-60 days of historical data)

### Why This Approach?

1. Different customers may have different demand patterns
2. A chocolate company may need different model than a snack company
3. We invest effort upfront to find the best fit
4. Once selected, the winning model runs in production

### Model Architecture

We'll train **one global model** rather than 2,800 separate models:

```
Global Model Approach:
- Train single model on ALL (SKU, Outlet, Date) combinations
- Model learns patterns across all products and locations
- SKU and Outlet characteristics become features
- Handles cold-start better (new outlets can borrow patterns)
```

### Why Global Over Individual Models?

- **Data efficiency**: Low-volume SKUs benefit from high-volume patterns
- **Faster training**: One model vs thousands
- **Easier maintenance**: Update one model, not thousands
- **Cross-learning**: Airport outlets teach each other patterns

---

## Feature Engineering

### Feature Categories

#### 1. Calendar Features
```python
features = {
    'day_of_week': 0-6,          # Monday=0, Sunday=6
    'day_of_month': 1-31,
    'week_of_year': 1-52,
    'month': 1-12,
    'is_weekend': 0/1,
    'is_month_start': 0/1,
    'is_month_end': 0/1,
}
```

#### 2. Lag Features (Historical Patterns)
```python
lag_features = {
    'sales_lag_1': sales 1 day ago,
    'sales_lag_7': sales 7 days ago (same weekday),
    'sales_lag_14': sales 14 days ago,
    'sales_lag_28': sales 28 days ago,
    'sales_lag_364': sales ~1 year ago (same weekday),

    # Rolling statistics
    'sales_rolling_7_mean': average of last 7 days,
    'sales_rolling_7_std': std dev of last 7 days,
    'sales_rolling_28_mean': average of last 28 days,
}
```

#### 3. SKU Features
```python
sku_features = {
    'category_id': product category (encoded),
    'price_per_unit': product price,
    'avg_historical_sales': mean daily sales for this SKU,
    'sales_volatility': coefficient of variation,
}
```

#### 4. Outlet Features
```python
outlet_features = {
    'city': encoded (Bangalore, Mumbai, Delhi, Hyderabad),
    'format': encoded (Airport, Kiosk, Cafe, Cloud Kitchen),
    'outlet_avg_sales': mean daily sales for this outlet,
    'outlet_size_rank': relative size ranking,
}
```

#### 5. Event Features
```python
event_features = {
    'is_event_day': 0/1,
    'event_type': holiday/promo/custom (encoded),
    'days_to_event': -7 to +7 (captures pre/post event effects),
    'days_since_event': how many days since last event ended,
    'event_historical_uplift': observed uplift from same event last year,
}
```

---

## Event Integration

### Two Types of Events

| Event Mode | Purpose | How It's Used |
|------------|---------|---------------|
| `flag` | Train ML model | Becomes feature in training data |
| `uplift` | Post-processing | Applied after ML prediction |

### Flag Events (ML Training)

When an event has `mode = 'flag'`:
1. The event dates are marked in historical training data
2. Model learns "when Diwali flag is ON, sales increase by X%"
3. Future predictions automatically account for flagged events

```
Training Data Example:
| date       | sku  | outlet | event_flag | event_type | actual_sales |
|------------|------|--------|------------|------------|--------------|
| 2023-10-20 | A    | 1      | 1          | holiday    | 150          | ← Diwali
| 2023-10-21 | A    | 1      | 1          | holiday    | 180          | ← Diwali
| 2023-10-22 | A    | 1      | 0          | none       | 45           | ← Normal
```

### Uplift Events (Post-Processing)

When an event has `mode = 'uplift'`:
1. ML generates base prediction
2. Web app applies uplift percentage on top
3. This happens client-side, not in ML pipeline

```
Final Forecast = ML_Prediction × (1 + uplift_pct/100)
```

### Historical Event Matching

For events with `comparison_method = 'same_event'`:
- System uses `historical_ly_start_date` and `historical_ly_end_date`
- Matches to when the event actually occurred last year
- Important for floating holidays (e.g., Diwali moves each year)

---

## Confidence Intervals

### Approach: Quantile Regression

Instead of predicting just the mean, we train three models:
- **P10 model**: Predicts 10th percentile (lower bound)
- **P50 model**: Predicts median (point forecast)
- **P90 model**: Predicts 90th percentile (upper bound)

```python
# LightGBM quantile regression
model_p10 = lgb.train(params={'objective': 'quantile', 'alpha': 0.1}, ...)
model_p50 = lgb.train(params={'objective': 'quantile', 'alpha': 0.5}, ...)
model_p90 = lgb.train(params={'objective': 'quantile', 'alpha': 0.9}, ...)
```

### Confidence Rating Calculation

Based on the width of the prediction interval:

```python
def calculate_confidence(forecast, lower, upper):
    range_width = upper - lower
    range_pct = range_width / forecast if forecast > 0 else 1.0

    if range_pct < 0.24:
        return 'high'      # Tight interval = confident
    elif range_pct < 0.36:
        return 'medium'    # Moderate interval
    else:
        return 'low'       # Wide interval = uncertain
```

### Confidence by Horizon

| Horizon | Typical Confidence | Why |
|---------|-------------------|-----|
| 7 days | High | Recent patterns still relevant |
| 30 days | Medium | More uncertainty accumulates |
| 90 days | Low | Many unknowns, wider bands |

---

## New Product Forecasting

> **Note**: This feature is planned for later. Documenting the approach now.

### The Cold-Start Problem

New products have no historical sales data. We solve this using reference products.

### Approach: Similarity-Based Bootstrapping

1. User selects a reference SKU (similar existing product)
2. User sets a similarity factor (0.0 to 1.0)
3. New product's forecast = Reference SKU forecast × similarity factor

```python
def forecast_new_product(new_sku, reference_sku, similarity_factor, date, outlet):
    reference_forecast = model.predict(reference_sku, date, outlet)
    return reference_forecast * similarity_factor
```

### Transition Period

- Use reference-based forecasting for first 12 months
- Gradually blend in actual data as it accumulates
- After 12 months, use only the new product's own data

```python
def blended_forecast(new_product_forecast, reference_forecast, months_of_data):
    if months_of_data >= 12:
        return new_product_forecast

    blend_weight = months_of_data / 12
    return (blend_weight * new_product_forecast +
            (1 - blend_weight) * reference_forecast)
```

### Cannibalization

When a new product launches, it may steal sales from existing products.

```
cannibalization_impacts table:
├── source_sku_id: the new product
├── affected_sku_id: product losing sales
└── percentage: how much to reduce affected product's forecast
```

This adjustment is applied during prediction generation.

---

## Pipeline Architecture

### Daily Batch Process

```
┌─────────────────────────────────────────────────────────────────┐
│                     DAILY FORECAST PIPELINE                      │
│                      (runs overnight)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: DATA EXTRACTION                                          │
│ - Pull latest historical_sales from Supabase                     │
│ - Pull current SKUs, outlets, categories                         │
│ - Pull active events (mode = 'flag')                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: FEATURE ENGINEERING                                      │
│ - Generate calendar features                                     │
│ - Calculate lag features from historical data                    │
│ - Encode categorical variables                                   │
│ - Create event flags for training period                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: MODEL TRAINING (weekly, not daily)                       │
│ - Train P10, P50, P90 quantile models                            │
│ - Validate on holdout period                                     │
│ - Save model artifacts                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: PREDICTION GENERATION                                    │
│ - Generate features for next 90 days                             │
│ - Include future event flags                                     │
│ - Predict for all (SKU × Outlet × Date) combinations             │
│ - Calculate confidence ratings                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: WRITE TO SUPABASE                                        │
│ - Upsert predictions to forecasts table                          │
│ - Log pipeline run metadata                                      │
│ - Alert on anomalies or failures                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Training vs Prediction Frequency

| Task | Frequency | Time | Why |
|------|-----------|------|-----|
| Full model retrain | Weekly (Sunday night) | ~20:00 | Incorporate new sales patterns |
| Prediction generation | Daily | 21:00 | Fresh forecasts needed |
| Feature refresh | Daily | 21:00 | Lag features update with new sales |

### Retraining Strategy

We use **periodic retraining** (not one-time training):

```
Week 1: Train on 1.5 years data → Model v1
Week 2: Train on 1.5 years + 1 week → Model v2
Week 3: Train on 1.5 years + 2 weeks → Model v3
...
```

**Why retrain weekly?**
- Model learns from recent sales patterns
- Adapts to changing customer behavior
- New products get incorporated
- Seasonal shifts are captured

**Why not retrain daily?**
- Patterns don't change that fast
- Training takes ~5-10 minutes (unnecessary daily)
- Weekly is sufficient for most retail patterns

### Technology Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Language | Python 3.10+ | Industry standard for ML |
| ML Framework | LightGBM | Fast, accurate gradient boosting |
| Data Processing | Pandas, NumPy | Data manipulation |
| Database Client | supabase-py | Supabase Python SDK |
| Scheduling | Cron (local) / Cloud Scheduler | Daily triggers |
| Environment | Poetry or pip | Dependency management |

### Local Development Setup

```
ml-pipeline/
├── src/
│   ├── data/
│   │   ├── extract.py      # Pull data from Supabase
│   │   └── features.py     # Feature engineering
│   ├── models/
│   │   ├── train.py        # Model training
│   │   └── predict.py      # Prediction generation
│   ├── utils/
│   │   ├── config.py       # Configuration
│   │   └── logger.py       # Logging
│   └── main.py             # Pipeline orchestration
├── models/                  # Saved model artifacts
├── logs/                    # Pipeline logs
├── tests/                   # Unit tests
├── requirements.txt
└── README.md
```

---

## Output Specification

### Forecasts Table Schema

The ML pipeline writes to this table:

```sql
forecasts
├── id (UUID) - auto-generated
├── organization_id (UUID) - customer identifier
├── outlet_id (UUID) - which outlet
├── sku_id (UUID) - which product
├── forecast_date (DATE) - prediction target date
├── forecast_value (INTEGER) - predicted units (P50)
├── lower_bound (INTEGER) - P10 prediction
├── upper_bound (INTEGER) - P90 prediction
├── confidence_rating (TEXT) - 'high'/'medium'/'low'
├── created_at (TIMESTAMP) - when prediction was made
└── updated_at (TIMESTAMP) - last update
```

### Daily Output Volume

```
Per customer per day:
- SKUs: 40
- Outlets: 70
- Forecast days: 90
- Total rows: 40 × 70 × 90 = 252,000 predictions

Upsert strategy: Replace predictions for dates ≥ today
```

### Data Freshness

- Predictions for today through +90 days are regenerated daily
- Historical predictions (before today) are kept for analysis
- Old forecasts can be archived after 1 year

---

## Development Phases

### Phase 1: Prototype with Synthetic Data

**Goal**: End-to-end pipeline working with demo data

- Generate realistic synthetic sales data
- Implement feature engineering
- Train baseline LightGBM model
- Write predictions to Supabase
- Verify forecasts appear in web app

**Deliverable**: Working prototype, forecasts visible in dashboard

### Phase 2: Production Pipeline

**Goal**: Robust pipeline ready for real customer data

- Add error handling and logging
- Implement data validation
- Add model performance monitoring
- Create pipeline scheduling
- Write documentation

**Deliverable**: Production-ready code, deployment guide

### Phase 3: Customer Onboarding

**Goal**: First customer live with forecasts

- Connect to real customer data
- Validate data quality
- Tune model for customer's patterns
- Establish accuracy baselines
- Set up alerting

**Deliverable**: First customer seeing real predictions

### Phase 4: Continuous Improvement

**Goal**: Ongoing model enhancement

- Track forecast accuracy vs actuals
- A/B test model improvements
- Add new feature engineering
- Implement new product forecasting
- Explore advanced models if needed

**Deliverable**: Accuracy improvements, new features

---

## Appendix: Key Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Model type | Test multiple, pick best | Different customers may have different patterns |
| Model selection timing | During customer onboarding | One-time effort per customer |
| Model architecture | Global (one model) | Data efficiency, cross-learning |
| Confidence intervals | Quantile regression | Works with most model types |
| Event integration | Feature-based for flags | Model learns patterns naturally |
| Uplift application | Post-processing in web app | User control, not in ML |
| Retraining frequency | Weekly | Incorporate new patterns without over-training |
| Prediction frequency | Daily at 21:00 | Fresh forecasts after ETL completes at 18:00 |
| Manual trigger | Future feature | After ML pipeline is stable |
| Local vs cloud | Local first | Cost-effective, cloud later |
| Data source | Supabase (not direct ERP) | ETL writes to Supabase, ML reads from same |

---

## Questions for Future Discussion

1. **Model retraining triggers**: Should we retrain immediately if accuracy drops?
2. **Anomaly detection**: How should we handle demand spikes from unexpected events?
3. **Multi-customer**: One model per customer, or one model across all customers?
4. **Feature store**: Should we invest in a proper feature store as we scale?

---

*Document created: December 2024*
*Last updated: December 2024*

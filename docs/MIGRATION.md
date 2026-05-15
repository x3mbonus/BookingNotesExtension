# Setup Guide

## Create the database

Run [`sql/SCHEMA.sql`](../sql/SCHEMA.sql) in your Supabase SQL Editor.

This creates three tables and seeds 26 features:
- `car_data` — car records (notes, metadata, ratings)
- `features_config` — feature dictionary (26 features, pre-populated)
- `car_features` — car↔feature state relationships

The script is idempotent — safe to run multiple times.

### Verify

```sql
SELECT id, key, label, priority, sort FROM features_config ORDER BY sort;
SELECT COUNT(*) FROM features_config;  -- should be 26
```

## Adding new features

```sql
INSERT INTO features_config (key, label, sort, priority)
VALUES ('feature_wireless_charging', 'Бездротова зарядка', 27, 1);
```

`sort` controls display order. Use the next available integer after 26.

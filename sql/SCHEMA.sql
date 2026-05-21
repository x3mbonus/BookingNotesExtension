-- ============================================================
-- Stay Notes Extension — Database Schema v2
-- Supports booking.com and airbnb.com accommodation notes.
-- Run once in your Supabase SQL Editor (clean slate — drops existing tables).
--
-- Table prefix: stay_
--   stay_features_config   — amenity feature dictionary
--   stay_property_data     — accommodation records
--   stay_property_features — property↔feature state
-- ============================================================


-- ------------------------------------------------------------
-- Drop existing tables (clean slate)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS public.stay_property_features;
DROP TABLE IF EXISTS public.stay_property_data;
DROP TABLE IF EXISTS public.stay_features_config;


-- ------------------------------------------------------------
-- 1. stay_features_config — amenity feature dictionary
-- ------------------------------------------------------------
CREATE TABLE public.stay_features_config (
  id            bigserial  NOT NULL,
  key           text       NOT NULL,
  label         text       NOT NULL,
  priority      smallint   NULL DEFAULT 0,
  sort          smallint   NULL DEFAULT 0,
  cool_priority integer    NULL,
  created_at    timestamp  NULL DEFAULT now(),
  updated_at    timestamp  NULL DEFAULT now(),
  CONSTRAINT stay_features_config_pkey    PRIMARY KEY (id),
  CONSTRAINT stay_features_config_key_key UNIQUE (key)
) TABLESPACE pg_default;

CREATE INDEX stay_features_config_key_idx  ON public.stay_features_config USING btree (key)  TABLESPACE pg_default;
CREATE INDEX stay_features_config_sort_idx ON public.stay_features_config USING btree (sort)  TABLESPACE pg_default;

ALTER TABLE public.stay_features_config DISABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 2. stay_property_data — accommodation records
-- ------------------------------------------------------------
CREATE TABLE public.stay_property_data (
  id                   bigserial  NOT NULL,
  property_id          text       NOT NULL,

  -- Notes & status
  text                 text       NULL,
  color                text       NULL DEFAULT '#e0e0e0',
  sort                 integer    NULL,
  confirmed            boolean    NULL DEFAULT false,
  unavailable          boolean    NOT NULL DEFAULT false,

  -- Identity
  name                 text       NULL,
  platform             text       NULL,
  url                  text       NULL,
  photo_url            text       NULL,
  location             text       NULL,
  site_rating          text       NULL,

  -- Prices per night (platform-specific)
  price_booking        text       NULL,
  price_airbnb         text       NULL,

  -- Property type: house, apartment, hotel, villa, etc.
  property_type        text       NULL,

  -- Rooms & sleeping
  bedrooms_count       text       NULL,
  sleeping_places      text       NULL,

  -- Bathrooms & toilets
  bathrooms_count      text       NULL,
  toilets_count        text       NULL,
  toilet_inside        text       NULL,  -- 'yes' | 'no' | NULL (unknown)

  -- Infrastructure
  heating_type         text       NULL,

  -- Reviews
  last_review_date     text       NULL,

  -- Cancellation: 'free' or a deadline date string
  cancellation_policy  text       NULL,

  -- Trip / search group (set from popup when saving a new note)
  trip                 text       NULL,

  -- Stay dates
  date_from            text       NULL,
  date_to              text       NULL,

  created_at           timestamp  NULL DEFAULT now(),
  updated_at           timestamp  NULL DEFAULT now(),

  CONSTRAINT stay_property_data_pkey             PRIMARY KEY (id),
  CONSTRAINT stay_property_data_property_id_key  UNIQUE (property_id)
) TABLESPACE pg_default;

CREATE INDEX stay_property_data_property_id_idx ON public.stay_property_data USING btree (property_id) TABLESPACE pg_default;
CREATE INDEX stay_property_data_sort_idx        ON public.stay_property_data USING btree (sort)        TABLESPACE pg_default;
CREATE INDEX stay_property_data_confirmed_idx   ON public.stay_property_data USING btree (confirmed)   TABLESPACE pg_default;
CREATE INDEX stay_property_data_created_at_idx  ON public.stay_property_data USING btree (created_at)  TABLESPACE pg_default;
CREATE INDEX stay_property_data_platform_idx    ON public.stay_property_data USING btree (platform)    TABLESPACE pg_default;

ALTER TABLE public.stay_property_data DISABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 3. stay_property_features — property↔feature state (✓ / ✗ / NULL=unknown)
-- ------------------------------------------------------------
CREATE TABLE public.stay_property_features (
  id          bigserial  NOT NULL,
  property_id text       NOT NULL,
  feature_id  bigint     NOT NULL,
  state       boolean    NULL,
  created_at  timestamp  NULL DEFAULT now(),
  updated_at  timestamp  NULL DEFAULT now(),
  CONSTRAINT stay_property_features_pkey                        PRIMARY KEY (id),
  CONSTRAINT stay_property_features_property_id_feature_id_key  UNIQUE (property_id, feature_id),
  CONSTRAINT stay_property_features_feature_id_fk               FOREIGN KEY (feature_id)
      REFERENCES public.stay_features_config (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX stay_property_features_property_id_idx ON public.stay_property_features USING btree (property_id) TABLESPACE pg_default;
CREATE INDEX stay_property_features_feature_id_idx  ON public.stay_property_features USING btree (feature_id)  TABLESPACE pg_default;
CREATE INDEX stay_property_features_state_idx       ON public.stay_property_features USING btree (state)       TABLESPACE pg_default;

ALTER TABLE public.stay_property_features DISABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 4. Seed stay_features_config
-- Cool features first (pool, jacuzzi, own territory), then amenities.
-- ------------------------------------------------------------
INSERT INTO public.stay_features_config (id, key, label, priority, sort, cool_priority) VALUES
  ( 1, 'feature_pool',            'Басейн',          0,  1, 1),
  ( 2, 'feature_jacuzzi',         'Джакузі',         0,  2, 1),
  ( 3, 'feature_own_territory',   'Своя територія',  0,  3, 1),
  ( 4, 'feature_beach_front',     'Перша лінія',     0,  4, 1),
  ( 5, 'feature_sea_view',        'Вид на море',     1,  5, 1),
  ( 6, 'feature_parking',         'Паркінг',         2,  6, NULL),
  ( 7, 'feature_ac',              'Кондиціонер',     2,  7, NULL),
  ( 8, 'feature_wifi',            'WiFi',            2,  8, NULL),
  ( 9, 'feature_kitchen',         'Кухня',           2,  9, NULL),
  (10, 'feature_washing_machine', 'Пральна машина',  2, 10, NULL),
  (11, 'feature_dishwasher',      'Посудомийна',     2, 11, NULL),
  (12, 'feature_balcony',         'Балкон/Тераса',   1, 12, NULL),
  (14, 'feature_breakfast',       'Сніданок',        1, 13, NULL);

SELECT setval('public.stay_features_config_id_seq', (SELECT MAX(id) FROM public.stay_features_config));


-- ------------------------------------------------------------
-- Migration for existing databases (run in Supabase SQL Editor):
--   ALTER TABLE public.stay_property_data ADD COLUMN IF NOT EXISTS trip text NULL;
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- Done. Verify with:
--   SELECT id, key, label, sort FROM stay_features_config ORDER BY sort;
--   SELECT COUNT(*) FROM stay_features_config;  -- should be 13
-- ------------------------------------------------------------

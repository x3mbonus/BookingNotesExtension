-- ============================================================
-- Stay Notes Extension — Database Schema
-- Supports booking.com and airbnb.com accommodation notes.
-- Run once in your Supabase SQL Editor to set up everything.
-- Safe to run multiple times (idempotent).
--
-- Table prefix: stay_
--   stay_features_config  — amenity feature dictionary
--   stay_property_data    — accommodation records
--   stay_property_features — property↔feature state
-- ============================================================


-- ------------------------------------------------------------
-- 1. stay_features_config — amenity feature dictionary
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stay_features_config (
  id         bigserial    NOT NULL,
  key        text         NOT NULL,
  label      text         NOT NULL,
  priority   smallint     NULL DEFAULT 0,
  sort       smallint     NULL DEFAULT 0,
  cool_priority integer   NULL,
  created_at timestamp    NULL DEFAULT now(),
  updated_at timestamp    NULL DEFAULT now(),
  CONSTRAINT stay_features_config_pkey    PRIMARY KEY (id),
  CONSTRAINT stay_features_config_key_key UNIQUE (key)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS stay_features_config_key_idx  ON public.stay_features_config USING btree (key)  TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS stay_features_config_sort_idx ON public.stay_features_config USING btree (sort) TABLESPACE pg_default;

ALTER TABLE public.stay_features_config DISABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 2. stay_property_data — accommodation records (notes, metadata, ratings)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stay_property_data (
  id               bigserial NOT NULL,
  property_id      text      NOT NULL,
  text             text      NULL,
  color            text      NULL DEFAULT '#e0e0e0',
  sort             integer   NULL,
  confirmed        boolean   NULL DEFAULT false,z
  name             text      NULL,
  price_per_night  text      NULL,
  location         text      NULL,
  site_rating      text      NULL,
  platform         text      NULL,
  bedrooms         text      NULL,
  beds             text      NULL,
  distance_beach   text      NULL,
  distance_airport text      NULL,
  url              text      NULL,
  photo_url        text      NULL,
  unavailable      boolean   NOT NULL DEFAULT false,
  created_at       timestamp NULL DEFAULT now(),
  updated_at       timestamp NULL DEFAULT now(),
  CONSTRAINT stay_property_data_pkey          PRIMARY KEY (id),
  CONSTRAINT stay_property_data_property_id_key UNIQUE (property_id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS stay_property_data_property_id_idx  ON public.stay_property_data USING btree (property_id)  TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS stay_property_data_sort_idx         ON public.stay_property_data USING btree (sort)          TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS stay_property_data_confirmed_idx    ON public.stay_property_data USING btree (confirmed)     TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS stay_property_data_created_at_idx   ON public.stay_property_data USING btree (created_at)   TABLESPACE pg_default;

ALTER TABLE public.stay_property_data DISABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 3. stay_property_features — property↔feature state (✓ / ✗ / NULL)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stay_property_features (
  id          bigserial NOT NULL,
  property_id text      NOT NULL,
  feature_id  bigint    NOT NULL,
  state       boolean   NULL,
  created_at  timestamp NULL DEFAULT now(),
  updated_at  timestamp NULL DEFAULT now(),
  CONSTRAINT stay_property_features_pkey                        PRIMARY KEY (id),
  CONSTRAINT stay_property_features_property_id_feature_id_key UNIQUE (property_id, feature_id),
  CONSTRAINT stay_property_features_feature_id_fk              FOREIGN KEY (feature_id)
      REFERENCES public.stay_features_config (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS stay_property_features_property_id_idx ON public.stay_property_features USING btree (property_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS stay_property_features_feature_id_idx  ON public.stay_property_features USING btree (feature_id)  TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS stay_property_features_state_idx       ON public.stay_property_features USING btree (state)       TABLESPACE pg_default;

ALTER TABLE public.stay_property_features DISABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 4. Seed stay_features_config (accommodation amenities)
-- Skips rows that already exist (idempotent).
-- ------------------------------------------------------------
INSERT INTO public.stay_features_config (id, key, label, priority, sort, cool_priority) VALUES
  ( 1, 'feature_pool',            'Басейн',         2,  1, NULL),
  ( 2, 'feature_beach_front',     'Перша лінія',    2,  2, 1),
  ( 3, 'feature_sea_view',        'Вид на море',    2,  3, 1),
  ( 4, 'feature_parking',         'Паркінг',        2,  4, NULL),
  ( 5, 'feature_ac',              'Кондиціонер',    2,  5, NULL),
  ( 6, 'feature_wifi',            'WiFi',           1,  6, NULL),
  ( 7, 'feature_kitchen',         'Кухня',          1,  7, NULL),
  ( 8, 'feature_washing_machine', 'Пральна машина', 1,  8, NULL),
  ( 9, 'feature_dishwasher',      'Посудомийна',    0,  9, NULL),
  (10, 'feature_balcony',         'Балкон/Тераса',  1, 10, NULL),
  (11, 'feature_jacuzzi',         'Джакузі',        0, 11, 1),
  (12, 'feature_gym',             'Спортзал',       0, 12, NULL),
  (13, 'feature_breakfast',       'Сніданок',       1, 13, NULL),
  (14, 'feature_elevator',        'Ліфт',           0, 14, NULL),
  (15, 'feature_pets',            'Тварини OK',     0, 15, NULL)
ON CONFLICT (key) DO NOTHING;

-- Keep sequence in sync
SELECT setval('public.stay_features_config_id_seq', (SELECT MAX(id) FROM public.stay_features_config));


-- ------------------------------------------------------------
-- Done. Verify with:
--   SELECT id, key, label, priority, sort FROM stay_features_config ORDER BY sort;
--   SELECT COUNT(*) FROM stay_features_config;  -- should be 15
-- ------------------------------------------------------------

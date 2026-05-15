-- ============================================================
-- Car Notes Extension — Initial Database Schema
-- Run once in your Supabase SQL Editor to set up everything.
-- Safe to run multiple times (idempotent).
-- ============================================================


-- ------------------------------------------------------------
-- 1. features_config — feature dictionary (26 features)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.features_config (
  id         bigserial    NOT NULL,
  key        text         NOT NULL,
  label      text         NOT NULL,
  priority   smallint     NULL DEFAULT 0,
  sort       smallint     NULL DEFAULT 0,
  cool_priority integer   NULL,
  created_at timestamp    NULL DEFAULT now(),
  updated_at timestamp    NULL DEFAULT now(),
  CONSTRAINT features_config_pkey    PRIMARY KEY (id),
  CONSTRAINT features_config_key_key UNIQUE (key)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS features_config_key_idx  ON public.features_config USING btree (key)  TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS features_config_sort_idx ON public.features_config USING btree (sort) TABLESPACE pg_default;

ALTER TABLE public.features_config DISABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 2. car_data — car records (notes, metadata, ratings)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.car_data (
  id              bigserial NOT NULL,
  car_id          text      NOT NULL,
  text            text      NULL,
  color           text      NULL DEFAULT '#e0e0e0',
  sort            integer   NULL,
  confirmed       boolean   NULL DEFAULT false,
  features_source text      NULL,
  make            text      NULL,
  model           text      NULL,
  price           text      NULL,
  price_eur       text      NULL,
  year            text      NULL,
  mileage         text      NULL,
  address         text      NULL,
  interior        text      NULL,
  seat_type       text      NULL,
  climate         text      NULL,
  owners          text      NULL,
  tow_hitch_type  text      NULL,
  url             text      NULL,
  sold            boolean   NOT NULL DEFAULT false,
  photo_url       text      NULL,
  created_at      timestamp NULL DEFAULT now(),
  updated_at      timestamp NULL DEFAULT now(),
  CONSTRAINT car_data_pkey       PRIMARY KEY (id),
  CONSTRAINT car_data_car_id_key UNIQUE (car_id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS car_data_car_id_idx    ON public.car_data USING btree (car_id)     TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS car_data_sort_idx      ON public.car_data USING btree (sort)       TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS car_data_confirmed_idx ON public.car_data USING btree (confirmed)  TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS car_data_created_at_idx ON public.car_data USING btree (created_at) TABLESPACE pg_default;

ALTER TABLE public.car_data DISABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 3. car_features — car↔feature state (✓ / ✗ / NULL)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.car_features (
  id         bigserial NOT NULL,
  car_id     text      NOT NULL,
  feature_id bigint    NOT NULL,
  state      boolean   NULL,
  created_at timestamp NULL DEFAULT now(),
  updated_at timestamp NULL DEFAULT now(),
  CONSTRAINT car_features_pkey                  PRIMARY KEY (id),
  CONSTRAINT car_features_car_id_feature_id_key UNIQUE (car_id, feature_id),
  CONSTRAINT car_features_feature_id_fk         FOREIGN KEY (feature_id)
      REFERENCES public.features_config (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS car_features_car_id_idx     ON public.car_features USING btree (car_id)     TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS car_features_feature_id_idx ON public.car_features USING btree (feature_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS car_features_state_idx      ON public.car_features USING btree (state)      TABLESPACE pg_default;

ALTER TABLE public.car_features DISABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 4. Seed features_config (26 features)
-- Skips rows that already exist (idempotent).
-- ------------------------------------------------------------
INSERT INTO public.features_config (id, key, label, priority, sort, cool_priority) VALUES
  ( 1, 'feature_acc',                    'ACC',                      2, 1,  NULL),
  ( 2, 'feature_parking_sensors',        'Парктроніки',              2, 4,  NULL),
  ( 3, 'feature_blind_spot',             'Blind spot',               2, 5,  NULL),
  ( 4, 'feature_lane_assist',            'Lane assist',              1, 6,  NULL),
  ( 5, 'feature_auto_parking',           'Автопаркування',           0, 20, NULL),
  ( 6, 'feature_android_auto_carplay',   'Android Auto / CarPlay',   2, 2,  NULL),
  ( 7, 'feature_heated_seats',           'Підігрів сидінь',          1, 12, NULL),
  ( 8, 'feature_heated_windshield',      'Підігрів лобового',        0, 13, NULL),
  ( 9, 'feature_heated_steering_wheel',  'Підігрів керма',           0, 14, 1),
  (10, 'feature_camera',                 'Камера',                   2, 3,  NULL),
  (11, 'feature_360_camera',             '360 камера',               0, 21, 1),
  (12, 'feature_signs',                  'Знаки',                    1, 7,  NULL),
  (13, 'feature_rear_traffic_alert',     'Rear traffic alert',       0, 8,  NULL),
  (14, 'feature_traffic_jam_assist',     'Traffic Jam Assist',       0, 9,  NULL),
  (15, 'feature_keyless',                'Keyless',                  1, 10, NULL),
  (16, 'feature_digital_cockpit',        'Digital cockpit',          1, 11, NULL),
  (17, 'feature_massage_seats',          'Масаж',                    1, 15, NULL),
  (18, 'feature_memory_seats',           'Пам''ять сидінь',          0, 16, 1),
  (19, 'feature_dcc',                    'DCC',                      0, 17, NULL),
  (20, 'feature_webasto',                'Webasto',                  0, 18, 1),
  (21, 'feature_matrix_headlights',      'Matrix',                   1, 19, NULL),
  (22, 'feature_panoramic_roof',         'Панорама',                 0, 25, NULL),
  (23, 'feature_electric_tailgate',      'Електробагажник',          1, 23, NULL),
  (24, 'feature_auto_tailgate',          'Автобагажник',             0, 24, NULL),
  (25, 'feature_tow_hitch',              'Фаркоп',                   2, 22, NULL),
  (26, 'feature_hud',                    'HUD',                      0, 26, NULL)
ON CONFLICT (key) DO NOTHING;

-- Keep the sequence in sync after explicit ID inserts
SELECT setval('public.features_config_id_seq', (SELECT MAX(id) FROM public.features_config));


-- ------------------------------------------------------------
-- Done. Verify with:
--   SELECT id, key, label, priority, sort FROM features_config ORDER BY sort;
--   SELECT COUNT(*) FROM features_config;  -- should be 26
-- ------------------------------------------------------------

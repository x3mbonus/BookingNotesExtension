# Car Notes Extension

A Chrome extension that adds a notes panel to car listings on [otomoto.pl](https://otomoto.pl) and [mobile.de](https://mobile.de). Track notes, ratings, features (ACC, CarPlay, camera, etc.), and compare cars across listings.

Data is stored in your own [Supabase](https://supabase.com) project — free tier is enough.

## Install

1. Download or clone this repository
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select this folder
5. The extension icon appears in your toolbar

## Setup (one time)

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), sign up (free), and create a new project.

### 2. Create the database tables

In your Supabase project, open **SQL Editor → New Query**, paste the contents of [`sql/SCHEMA.sql`](sql/SCHEMA.sql), and click **Run**.

This creates three tables (`car_data`, `features_config`, `car_features`) and seeds the 26 features. Safe to run multiple times.

### 3. Enter your credentials

1. Click the extension icon → **Settings** (or right-click → Options)
2. Paste your **Project URL** and **anon public key** from Supabase → Settings → API
3. Click **Save & Test** — you should see "Connected"

That's it. Open any car listing on otomoto.pl or mobile.de — the notes panel appears automatically.

## Usage

| Action | Behavior |
|--------|----------|
| Type in the note field | Auto-saves after 500ms |
| Click a feature button (ACC, CarPlay…) | Cycles ✓ / ? / ✗, saves instantly |
| Click a rating (Best/Good/Fair/Poor) | Saves instantly |
| Click **Verified** | Toggles confirmed status |
| Click **Compare** | Opens side-by-side comparison of saved cars |

## Supported sites

- [otomoto.pl](https://otomoto.pl) — listing pages and search results
- [mobile.de](https://mobile.de) — listing pages and search results

## Adding new features to the list

See [docs/MIGRATION.md](docs/MIGRATION.md).

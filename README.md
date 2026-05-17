# Stay Notes Extension

A Chrome extension that adds a notes panel to accommodation listings on [booking.com](https://booking.com) and [airbnb.com](https://airbnb.com). Track notes, ratings, amenities (pool, beach distance, parking, AC, etc.), and compare properties side by side.

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

This creates three tables (`stay_property_data`, `stay_features_config`, `stay_property_features`) and seeds 15 accommodation amenities. Safe to run multiple times.

### 3. Enter your credentials

1. Click the extension icon → **Settings** (or right-click → Options)
2. Paste your **Project URL** and **anon public key** from Supabase → Settings → API
3. Click **Save & Test** — you should see "Connected"

That's it. Open any property on booking.com or airbnb.com — the notes panel appears automatically.

## Usage

| Action | Behavior |
|--------|----------|
| Type in the note field | Auto-saves after 500ms |
| Click an amenity button (Pool, AC, WiFi…) | Cycles ✓ / ? / ✗, saves instantly |
| Click a rating (Best / Good / Fair / Poor) | Saves instantly |
| Click **Verified** | Toggles confirmed status |
| Click **Compare** | Opens side-by-side comparison of saved properties |

## Tracked amenities

Pool, beach front, sea view, parking, AC, WiFi, kitchen, washing machine, dishwasher, balcony, jacuzzi, gym, breakfast, elevator, pets allowed.

Manual fields: distance from beach (km), distance from airport (km), bedrooms, beds.

## Supported sites

- [booking.com](https://booking.com) — property pages and search results
- [airbnb.com](https://airbnb.com) — property pages and search results

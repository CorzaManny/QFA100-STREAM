# QFA100-STREAM

OBS Browser Source overlays for QFA100's WorldFlight broadcast: an animated
route map, a flight status bar, next-sector and turnaround screens, a compact
corner map, and a control dashboard. Built with React + Vite + MapLibre, and
reads live from the same Supabase project as QFA100-DASHBOARD (the pilot EFB).

## OBS Browser Sources

| Route         | What it is                                   | Browser Source size |
| ------------- | -------------------------------------------- | ------------------- |
| `/overlay`    | Transparent top status bar                   | 1920 × 150          |
| `/map`        | Full-screen animated route map               | 1920 × 1080         |
| `/next`       | Next-sector briefing (map, crew, weather)    | 1920 × 1080         |
| `/turnaround` | Arrival screen over an aerial orbit of the destination | 1920 × 1080 |
| `/compact`    | Corner map with ALT / SPD / ETA              | 800 × 320           |
| `/control`    | Control dashboard (dashboard sign-in)        | any browser         |

Every graphic is laid out on a fixed canvas and scales to the source size, so
720p/1440p work too. The page background is always transparent; add `?bg`
to a URL to check an overlay against a dark backdrop in a normal browser.

## Previewing before/between flights

Add `?flight=<flight>&progress=<0-1>` to any overlay to pin a sector and
simulate how far along it is, e.g.

```
http://localhost:5173/next?flight=WF2601&progress=0.55
http://localhost:5173/turnaround?flight=WF2601&progress=0.9
```

A small **PREVIEW** tag shows in the corner so it can't go to air by accident.
The control dashboard has a Preview button on every sector.

## Where the data comes from

All the same sources as the dashboard, so the two never disagree:

- **Schedule and actuals** — `sectors`, `sector_actuals`.
- **Crew** — the `broadcast_crew` view (names and seats only, and only once
  the roster is published).
- **Aircraft, registration, runways, cruise level and the planned route** —
  each sector's SimBrief OFP via the `broadcast_briefing` view. The map draws
  the real navlog; without an OFP it falls back to a great circle.
- **Team callsign and aircraft type** — Admin → SimBrief in the dashboard,
  via the `broadcast_config` view.
- **Live position** — the team callsign on the public VATSIM data feed.
- **Weather** — `metar.vatsim.net` (the same METAR source the dashboard uses).
- **Airports** — the dashboard's `airports.json`, copied into `public/`.
- **Map imagery** — Esri World Imagery under NASA Black Marble night lights;
  no API keys needed.

### How the on-air sector is chosen

Automatic mode mirrors the dashboard: the sector the team callsign has filed
on VATSIM, else one stamped off-blocks, else whichever the schedule says is
airborne. Between flights it shows the next one up. If WorldFlight runs off
schedule, sign in at `/control` with an admin/dispatcher/operations account
and press **Put on air** on the right sector; **Return to automatic** undoes it.

## Setup

### 1. Database

The migrations in `supabase/migrations/` have already been applied to the
QFA100 Dashboard project. They add the `broadcast_state` table, the
read-only `broadcast_crew` / `broadcast_briefing` / `broadcast_config` views,
and anonymous read access to `sectors` and `sector_actuals`. Nothing else in
the EFB (accounts, VATSIM CIDs, handovers, fuel, etc.) is exposed.

### 2. Run locally

```
npm install
npm run dev
```

`.env` holds the Supabase URL and publishable key (see `.env.example`). The
publishable key is safe in the browser; never put the `service_role` key here.

### 3. Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages at `https://corzamanny.github.io/QFA100-STREAM/`
(e.g. `.../QFA100-STREAM/map`). One-time setup: **Settings → Pages → Source:
GitHub Actions**. Pages on a private repo needs a paid GitHub plan; otherwise
make the repo public (nothing secret is committed — the Supabase key in the
workflow is the publishable one).

### 4. live.qfa100.org (GoDaddy DNS)

| Type  | Name | Value                 | TTL    |
| ----- | ---- | --------------------- | ------ |
| CNAME | live | `corzamanny.github.io` | 1 hour |

Then:

1. **Settings → Pages → Custom domain**: `live.qfa100.org`, and tick
   **Enforce HTTPS** once the certificate is issued.
2. **Settings → Secrets and variables → Actions → Variables**: add
   `BASE_PATH` = `/`, then re-run the deploy workflow so the site is built
   for the root of the domain instead of `/QFA100-STREAM/`.

## Branding

The event name and tagline on the full-screen scenes are constants at the
top of `src/components/Brand.jsx`.

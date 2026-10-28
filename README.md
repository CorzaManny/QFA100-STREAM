# QFA100-STREAM

OBS Browser Source overlays for QFA100's WorldFlight broadcast: an animated
route map, a flight status bar, next-sector and turnaround screens, a compact
corner map, and a control dashboard. Built with React + Vite + MapLibre, and
reads live from the same Supabase project as QFA100-DASHBOARD (the pilot EFB).

## OBS Browser Sources

| Route         | What it is                                   | Browser Source size |
| ------------- | -------------------------------------------- | ------------------- |
| `/overlay`    | Transparent top status bar                   | 1920 × 150          |
| `/boarding`   | Now boarding: a sped-up fly-through of the planned route with a chase camera, then a split-flap departures board (2 legs before, ~10 after, with actual off/on blocks), on a loop. `?board` opens on the board. | 1920 × 1080 |
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

- **Schedule and actuals** — `sectors`, `sector_actuals`: times, the sector
  number out of the whole relay, WorldFlight's departure window, the leg, and
  the fuel each sector actually burnt.
- **Crew** — the `broadcast_crew` view (names and seats only, and only once
  the roster is published).
- **Aircraft, registration, runways, cruise level, the planned route, the
  alternate, cost index, passengers, cargo and fuel** — each sector's SimBrief
  OFP via the `broadcast_briefing` view. The map draws the real navlog;
  without an OFP it falls back to a great circle. (Weights beyond the payload
  and the OFP PDF link stay private.)
- **Team callsign, aircraft type and the turnaround/taxi rules** — Admin →
  SimBrief in the dashboard, via the `broadcast_config` view.
- **Live position** — the simulator's own report first (`broadcast_sim`, the
  document the vPilot bridge publishes every couple of seconds: phase of
  flight, IAS, Mach, vertical speed, fuel on board, the FMC's ETA, the block
  times and the touchdown rate), falling back to the team callsign on the
  public VATSIM data feed when the bridge is not running. Whichever is in use
  is named on screen.
- **How the programme is running** — the same maths as the EFB's
  `running.js`, over the stamped times and the live arrival estimate, so
  "ON SCHEDULE" / "25 MIN BEHIND" on air matches the flight deck.
- **Weather** — `metar.vatsim.net` for the METAR (the same source the
  dashboard uses) and the dashboard's own `taf_cache`, via `broadcast_taf`,
  for the forecast.
- **Airports** — the dashboard's `airports.json`, copied into `public/`.
- **Map imagery** — Esri World Imagery under NASA Black Marble night lights;
  no API keys needed. A service worker (`public/tile-sw.js`) keeps tiles on
  disk, and the boarding fly-through downloads its route's imagery before it
  starts, so the map doesn't fill in on screen.
- **Day/night line** — computed from the sun's position for the moment the
  plane is shown at: live time while really flying, otherwise scheduled
  departure plus flight time so far. On `/boarding` it moves with the
  sped-up flight, so you can see whether a leg flies into a sunset.

### How the on-air sector is chosen

Automatic mode mirrors the dashboard: the sector the team callsign has filed
on VATSIM, else one stamped off-blocks, else whichever the schedule says is
airborne. Between flights it shows the next one up. If WorldFlight runs off
schedule, sign in at `/control` with an admin/dispatcher/operations account
and press **Put on air** on the right sector; **Return to automatic** undoes it.

## Setup

### 1. Database

The migrations in `supabase/migrations/` are applied to the QFA100 Dashboard
project. They add the `broadcast_state` table, the read-only
`broadcast_crew` / `broadcast_briefing` / `broadcast_config` /
`broadcast_sim` / `broadcast_taf` views, and anonymous read access to
`sectors` and `sector_actuals`. Nothing else in the EFB (accounts, VATSIM
CIDs, handover notes, the tech log, ops chat) is exposed.

Run any new migration against the dashboard project before deploying: the
overlays treat a missing view as "no data" and carry on, so a scene will
quietly fall back to VATSIM and drop the forecast until it is applied.

### 2. Run locally

```
npm install
npm run dev
```

`.env` holds the Supabase URL and publishable key (see `.env.example`). The
publishable key is safe in the browser; never put the `service_role` key here.

### 3. Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages at **https://stream.qfa100.org** — so the OBS
sources are `https://stream.qfa100.org/map`, `/overlay`, `/boarding` and so
on. One-time setup: **Settings → Pages → Source: GitHub Actions**. Pages on
a private repo needs a paid GitHub plan; otherwise make the repo public
(nothing secret is committed — the Supabase key in the workflow is the
publishable one).

### 4. stream.qfa100.org (GoDaddy DNS)

| Type  | Name     | Value                  | TTL    |
| ----- | -------- | ---------------------- | ------ |
| CNAME | `stream` | `corzamanny.github.io` | 1 hour |

That record is in place. `public/CNAME` tells Pages the site answers on
`stream.qfa100.org`, so the custom domain survives every deploy, and the
build uses `/` as its base path — there is no `BASE_PATH` repo variable to
set. In **Settings → Pages**, tick **Enforce HTTPS** once the certificate
has been issued (it already has been).

To go back to serving from `corzamanny.github.io/QFA100-STREAM/`, delete
`public/CNAME`, clear the custom domain in Settings → Pages, and add a
`BASE_PATH` = `/QFA100-STREAM/` repo variable under **Settings → Secrets and
variables → Actions → Variables**.

## Branding

The event name and tagline on the full-screen scenes are constants at the
top of `src/components/Brand.jsx`.

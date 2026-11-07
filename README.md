# Receipto

A UK food price tracker. Scan a supermarket receipt, and Receipto turns the line items into a live price map across Tesco, Sainsbury's, Asda, Morrisons, Aldi, Lidl, Waitrose, Co-op, M&S and Iceland.

Built as a working prototype with **SvelteKit**, **PostgreSQL**, **Better Auth**, **Drizzle ORM**, **Tailwind CSS**, **Skeleton UI**, **Leaflet + OpenStreetMap**, and **Datalab Indra OCR running on-device in the browser**.

![Receipto](https://img.shields.io/badge/status-prototype-7DE04B) ![SvelteKit](https://img.shields.io/badge/SvelteKit-3-FF3E00) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791) ![Indra OCR](https://img.shields.io/badge/OCR-Indra%20on--device-00539F)

## Features

- **Receipt scanning from photo / camera** — Indra OCR runs locally in the browser with ONNX Runtime Web. The photo never leaves the device.
- **Discount-aware totals** — negative and named discount lines (Clubcard, multibuy, coupon, Nectar, price match) are separated from products and reconciled against the printed subtotal/total, so item sums, discounts and the amount paid stay consistent.
- **Location and radius** — enter a UK postcode/town or use browser geolocation, then restrict the map and every price comparison to stores within 1–50 miles.
- **Price database per store per region** — every line item upserts a current `item_prices` row for that shop/product, with seeded regional and chain price variation.
- **OpenStreetMap store map** — real UK supermarket coordinates imported from OSM via Overpass. Click a store to see its prices; markers show the price of the searched item (or your most recent item) above the store.
- **Accounts and sessions** — Better Auth email/password auth with Drizzle-backed sessions.
- **Dashboard** — your latest shops, basket comparison against the previous shop, 30-day spend, item count, price charts and recent purchases.
- **Basket comparison** — click any recent shop to see the same basket priced at the nearest store of every other chain, using own-brand equivalents for own-brand items and the same product for branded items.
- **Product search** — the global search groups all own-brand milks/breads/etc. under one class result per product type; branded products stay individual. Clicking an own-brand result opens every supermarket's variant.
- **Product-class equivalence** — the White Bread category groups own-brand equivalents from Tesco, Sainsbury's, Aldi, Co-op and others, while branded products stay separate. Warburtons at Sainsbury's and Warburtons at Tesco remain one product.
- **Product matching** — the `ReceiptItem -> Product` mapping is learned in `receipt_to_product` (the prototype's `ReceiptToProduct`) and reused on future scans.
- **Sidebar** — product search, items from your last shops, and your commonly bought items.
- **Demo data** — a realistic UK catalogue, 346 OSM stores, 28k+ current prices, four accounts and 40+ seeded receipts.

## Tech stack

| Layer | Choice |
| --- | --- |
| App | SvelteKit 3, Svelte 5 runes |
| Styling | Tailwind CSS 4, Skeleton UI 5 (`theme.css` included) |
| Auth | Better Auth 1.7 (email + password, Drizzle adapter) |
| Database | PostgreSQL 14+ |
| ORM / migrations | Drizzle ORM + drizzle-kit |
| Map | Leaflet + OpenStreetMap tiles |
| OCR | Indra OCR (`@ducng99/indra-ocr-js/browser`) + ONNX Runtime Web |
| Icons | lucide-svelte |
| Adapter | `@sveltejs/adapter-node` |

## Quick start

### Prerequisites

- **Node.js 24+** (SvelteKit 3 requires Node `>=22.17`; the OCR package targets 24)
- PostgreSQL 14+ (Homebrew, Docker, or your own server)
- npm

```bash
nvm use          # .nvmrc -> 24.18.0
npm install      # also copies ONNX Runtime Web binaries into static/ort
```

### 1. Create the database

#### Local PostgreSQL (Homebrew example)

```bash
brew services start postgresql@14
createdb receipto
```

#### Or Docker

```bash
docker compose up -d
# then set DATABASE_URL=postgres://receipto:receipto@localhost:5432/receipto
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
DATABASE_URL=postgres://localhost:5432/receipto
BETTER_AUTH_SECRET=replace-with-a-long-random-string
BETTER_AUTH_URL=http://localhost:5173
PUBLIC_INDRA_MODEL_BASE=
```

`PUBLIC_INDRA_MODEL_BASE` can stay empty: the browser streams the pinned Indra models from Hugging Face on first use and the browser caches them. Set it to a local URL/path if you host the model files yourself.

### 3. Migrate and seed

```bash
npm run db:migrate
npm run seed:reset
```

The seed script:

- loads `src/lib/data/osm-shops.json` if present (346 real OSM stores), otherwise the curated fallback list;
- creates 55 product classes and 575 products across 10 UK chains;
- creates 28,600 current price rows with regional and chain variation;
- creates four demo accounts and 40+ realistic receipts;
- populates the receipt-name translation table.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:5173>. To access it from another device on your network, run `npm run dev -- --host`; Better Auth resolves the request origin in development.

For a production build:

```bash
npm run build
PORT=3000 BETTER_AUTH_URL=http://localhost:3000 npm start
```

`npm start` loads `.env` via `--env-file-if-exists`, so set `BETTER_AUTH_URL` to the origin you actually serve on (the dev default is `http://localhost:5173`).

**Demo account:** `demo@receipto.app` / `demo1234`

Other seeded accounts: `alex@receipto.app`, `priya@receipto.app`, `sam@receipto.app` — all use `<name>1234` as the password.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build (adapter-node) |
| `npm start` | Run the built Node server |
| `npm run check` | Svelte + TypeScript checks |
| `npm run db:generate` | Generate a new Drizzle migration from `src/lib/server/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run seed` | Seed only if the database is empty |
| `npm run seed:reset` | Wipe and reseed all prototype data |
| `npm run osm:fetch` | Re-import supermarket locations from Overpass into `src/lib/data/osm-shops.json` |
| `npm run osm:areas` | Enrich existing OSM shops with localities for store labels |
| `npm run db:sync-shops` | Apply shop areas and backfill receipt subtotals without wiping user data |
| `npm run copy:ort` | Copy ONNX Runtime Web binaries into `static/ort` (runs on install) |

## On-device OCR

Receipt scanning uses Datalab's [Indra OCR](https://huggingface.co/datalab-to/indra-ocr) through [`@ducng99/indra-ocr-js`](https://www.npmjs.com/package/@ducng99/indra-ocr-js), which runs the ONNX models with ONNX Runtime Web (WASM).

- The first scan downloads the detector, recogniser, language model, orientation and reading-order models (~24 MB with CJK disabled). The browser caches them.
- `static/ort` contains the ONNX Runtime Web WASM binaries and is generated by `scripts/copy-ort.mjs` on `npm install` (git-ignored).
- OCR output is reconstructed by row (names on the left, prices on the right) before parsing.
- The receipt parser is a pure TypeScript module (`src/lib/utils/receipt-parser.ts`) and also works with pasted text.
- Discount lines are not products. The parser reconciles the item subtotal, discount candidates and the printed total; it handles both negative discount lines and positive “savings” lines that are already reflected in the total.
- Store labels combine the OSM shop name with its locality, so the scanner review lists names such as “Lidl Withington” or “Lidl Didsbury” instead of several identical “Lidl” entries.
- Only the extracted text goes to the server, where product matching / alias learning runs. The image itself never leaves the browser.
- If the model download is blocked, the UI falls back to paste-text and sample modes.

## Location and radius

- Location is saved per account in `user_settings`.
- The input accepts UK postcodes/towns via Nominatim (OpenStreetMap's geocoder) and can use browser geolocation.
- The chosen radius is stored in miles; all price stats, product comparisons, dashboard price hints and map markers are filtered to shops inside it.
- The map draws a dashed radius circle and centres on the saved location.
- Clearing the location restores all-UK prices.

### Optional local model hosting

To avoid the first-run HF download:

1. Download the pinned files from `datalab-to/indra-ocr` (`meta.json`, `det.onnx`, `rec.onnx`, `order.onnx`, `orient.onnx`, `lm.npz`) plus the optional group models.
2. Put them in `static/models/indra/`.
3. Set `PUBLIC_INDRA_MODEL_BASE=/models/indra` in `.env`.

## OpenStreetMap data

`scripts/fetch-osm-shops.mjs` queries the Overpass API city-by-city, filters the 10 supported chains, de-duplicates and caps each chain at 3 stores per city for a readable map. `src/lib/data/osm-shops.json` currently holds 346 shops across 16 UK cities, with `osmId`/`osmType` and addresses.

If Overpass is unavailable, `src/lib/data/fallback-shops.ts` provides curated approximate locations so the prototype still works.

Map tiles: © OpenStreetMap contributors. Store data is ODbL.

## Data model

The prototype schema lives in `src/lib/server/schema.ts`:

```
user / session / account / verification        Better Auth
user_settings (UserID, Lat, Lng, Label, RadiusMiles)
product_classes (ClassID, Name, Category)
products (ProdID, ClassID, ItemName, Brand, Size, Supermarket)
shops (ShopID, ShopName, Area, SupermarketName, Lat, Lng, City, Region, OSM IDs)
receipts (ReceiptID, UserID, ShopID, PurchasedAt, Subtotal, DiscountTotal, Total, ItemCount)
item_purchases (PurchaseID, ReceiptID, ProdID, NameInReceipt, Price, Quantity)
item_prices (ShopID, ProdID, Price, UpdatedAt)   current price per shop/product
receipt_to_product (ProdID, NameInReceipt, SupermarketName)  alias/translation table
```

`ProductClass` is the equivalence layer: Tesco White Bread, Co-op White Bread and Aldi White Bread are different `Product`s in the same class. The product detail page compares them side-by-side.

## Project structure

```
scripts/
  fetch-osm-shops.mjs     Overpass import -> src/lib/data/osm-shops.json
  seed.ts                 realistic UK catalogue, shops, accounts, receipts
  copy-ort.mjs            ONNX Runtime Web -> static/ort
src/
  env.ts                  SvelteKit 3 env declarations ($app/env)
  lib/
    components/           AppShell, Sidebar, StoreMap, ReceiptScanner, ...
    data/                 product catalogue, fallback shops, OSM shops
    ocr/indra.ts          browser OCR engine + progress + row reconstruction
    server/               db, schema, auth, queries, receipt ingestion
    utils/                receipt parser, normalisation, formatting
  routes/
    (app)/                authed dashboard, map, products, shops, scan
    api/                  auth, products, map, receipts, stores
    login/ register/      auth screens
    +page.svelte          marketing landing page
drizzle/                  generated SQL migrations
theme.css                 Skeleton custom theme (provided with the project)
```

## Migrations

Drizzle is the source of truth. Edit `src/lib/server/schema.ts`, then:

```bash
npm run db:generate
npm run db:migrate
```

The generated SQL is committed under `drizzle/`.

## Notes & limitations

- This is a **prototype**. Prices are generated from a realistic catalogue, with regional multipliers and store-level variation; they are not live retail data.
- Indra OCR is fast and good on clean print, but complex tables, crumpled receipts and handwriting can produce OCR slips. The review screen lets you fix names, prices and quantities before saving.
- Own-brand equivalence is modelled at the product-class level rather than through barcode matching.
- The app is designed for UK receipts and GBP.
- Better Auth uses the built-in email/password provider. There is no email verification flow in the prototype.

## Credits

- OCR model: [Datalab Indra OCR](https://huggingface.co/datalab-to/indra-ocr) (OpenRAIL-M weights)
- Browser OCR runtime: [`@ducng99/indra-ocr-js`](https://github.com/ducng99/indra-ocr-js)
- Maps: [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, tiles by the OSM Foundation
- UI: [Skeleton](https://skeleton.dev) + Tailwind CSS
- Icons: [Lucide](https://lucide.dev)

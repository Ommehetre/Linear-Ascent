# TerraPulse — Multimodal Micro-Climate & Crop Yield Intelligence Engine

> An autonomous agent web application combining live Copernicus Sentinel-2 satellite imagery, ISRO Bhuvan overlays, real-time root-zone soil telemetry, and 10-year Indian monsoon reanalysis to forecast micro-climate risks, predict crop yield impact, and output automated risk mitigation plans.

---

## Zero Dummy Data Compliance

TerraPulse adheres strictly to a **Zero Dummy Data Policy**:
- **0 hardcoded JSON files, 0 random/simulated sensors, and 0 placeholder numbers**.
- Every single metric, soil reading, satellite scene, and chart is fetched dynamically from real-time external APIs or active streams:
  1. **Copernicus Sentinel-2 L2A STAC**: Live queries to Element84 Earth Search AWS STAC (`POST https://earth-search.aws.element84.com/v1/search`) with Cloud-Optimized GeoTIFF (COG) visual / NIR bands (`visual`, `B04`, `B08`) and optical thumbnails.
  2. **ISRO Bhuvan LULC WMS**: Proxied via Next.js backend proxy (`/api/proxy/bhuvan`) to eliminate browser CORS blocks.
  3. **Root-Zone Soil Sensor Grid**: Real-time hourly soil moisture and temperature at 3 depth strata (`0-7cm`, `7-28cm`, `28-100cm`) and daily $ET_0$ via Open-Meteo ERA5 Seamless.
  4. **Live Physical IoT Sensor SSE Feed**: `/api/soil-telemetry/stream` endpoint accepting live HTTP POST payloads from physical ESP32/MQTT sensors and streaming updates via Server-Sent Events.
  5. **10-Year Indian Monsoon (JJAS) & Climate Baseline**: Open-Meteo Historical Archive combined with solar radiation and evapotranspiration flux from NASA POWER Agroclimatology.
  6. **Soil Physical Composition**: Clay, sand, silt, organic carbon, and bulk density from ISRIC SoilGrids v2 and ICAR regional surveys.
  7. **Real-time Mandi Market Prices**: Live Agmarknet crop prices and arrival volumes via Data.gov.in API.

---

## Deterministic Agro-Climatic Mathematics

TerraPulse computes physical formulas in code before passing context to AI models:
- **Saxton-Rawls (2006) Pedotransfer Functions**: Volumetric Field Capacity ($FC$) and Wilting Point ($WP$) in $\text{m}^3/\text{m}^3$.
- **Soil Moisture Deficit Index (SMDI)**: Root-zone moisture deficit scale from $-1.0$ (extreme drought) to $0.0$ (field capacity).
- **FAO-33 Crop Water Production Function**:
  $$\left(1 - \frac{Y_a}{Y_m}\right) = K_y \times \left(1 - \frac{ET_a}{ET_m}\right)$$
  Computes predicted **Yield Reduction (%)**, **Estimated Yield (t/ha)**, and **Deficit Irrigation Needed (L/ha)** using crop-specific yield response factors ($K_y$ for Rice, Wheat, Cotton, Soybean, Pulses).
- **Standardized Precipitation Evapotranspiration Index (SPEI)**: Monthly climatic water balance ($P - ET_0$) evaluated via Wilson-Hilferty transformation.

---

## 4-Node Autonomous Agent Architecture

Powered by `@google/genai` (**Gemini 2.5 Flash**):

1. **Node 1: Autonomous Telemetry Harvester & Self-Healing Router**
   - Ingests all 5 live streams in parallel via `Promise.allSettled`.
   - Automatic self-healing: expands the temporal search window if cloud cover exceeds threshold.
2. **Node 2: Multimodal Vision & Spectral Analyst**
   - Analyzes live Copernicus Sentinel-2 optical imagery using Gemini Multimodal Vision (`inlineData` base64).
   - Detects soil surface crusting, vegetative browning, standing water, and canopy density.
3. **Node 3: Micro-Climate Risk & Yield Forecaster**
   - Synthesizes FAO deterministic yield math, 10-year Monsoon LPA deviation, and vision observations.
   - Classifies risk with inline source citations (`<cite source="..." ts="..."/>`).
4. **Node 4: Actionable Mitigation & Supply Chain Execution Engine**
   - Generates 7-day deficit irrigation schedules (L/ha/day).
   - Provides harvest timing advisories and cold storage / APMC mandi routing based on live Agmarknet prices.

---

## UI / UX Geospatial Dashboard

- **Interactive MapLibre GL Dark Map**: Preset pins for **Vidarbha (Cotton)**, **Marathwada (Soybean)**, **Chota Nagpur (Rice)**, and **Punjab (Wheat)**, with click-to-analyze custom micro-coordinates and ISRO Bhuvan WMS overlay toggle.
- **Monsoon & Soil Recharts Visualizations**: Dual-axis 10-year historical JJAS vs 14-day rainfall forecast; 3-depth soil moisture curves vs $FC$ and $WP$ hydraulic thresholds.
- **Live API Proof & Agent Trace Drawer**: Inspectable real-time HTTP status badges, latency meters (ms), and raw payload viewer.
- **Export Engine**: One-click generation of official downloadable PDF advisories (`@react-pdf/renderer`) and JSON action payloads.

---

## Quick Start

### 1. Prerequisites
- Node.js 18+ or 20+
- Git

### 2. Setup Environment
Clone the repository and install dependencies:
```bash
git clone https://github.com/Ommehetre/Linear-Ascent.git
cd Linear-Ascent
npm install
```

Copy the environment template and fill in your keys:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
DATA_GOV_IN_API_KEY=your_data_gov_in_api_key_here
```

### 3. Build & Run
```bash
npm run build
npm run start
```
Open **`http://localhost:3000`** in your browser.

### 4. Run Automated End-to-End Test Suite
```bash
npm test
```
Verifies all 9 endpoints against live external APIs.

---

## License
MIT

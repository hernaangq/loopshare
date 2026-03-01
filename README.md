

![alt text](image.png)

A Chicago Loop desk-sharing marketplace powered by a multi-agent AI system and machine learning occupancy prediction. Corporations with underutilized post-pandemic office space list available desks; startups discover and book them. The AI layer analyzes real Chicago open data to match startups with buildings, assess deal risk, auto-generate outreach emails and lease drafts, and proactively identify "ghost buildings" ripe for conversion. A built-in tax estimator helps hosts quantify savings under the Illinois Enterprise Zone Act, turning vacant floors into tax-advantaged revenue streams.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [Multi-Agent AI System](#multi-agent-ai-system)
- [ML Occupancy Model](#ml-occupancy-model)
- [Deal Scout Pipeline](#deal-scout-pipeline)
- [API Reference](#api-reference)
- [Frontend Pages](#frontend-pages)
- [Data Model](#data-model)
- [Project Structure](#project-structure)
- [Test Scripts](#test-scripts)
- [Chicago Open Data APIs](#chicago-open-data-apis)
- [Notes & Limitations](#notes--limitations)

---

## Overview

SharedLoop solves two problems at once:

- **Corporations** in Chicago's Loop district have floors of empty desks post-pandemic — a liability cost they can convert into revenue by listing available space.
- **Startups** need flexible, affordable desk space at a prestigious address without committing to a multi-year lease.

The platform's AI pipeline uses real public data (Chicago Energy Benchmarking, Building Violations, Business Licenses, CTA Ridership) to score building quality, evaluate deal risk on both sides, and produce ready-to-send outreach materials — all in a single API call.

Additionally, a **Gradient Boosting ML model** trained on Chicago Energy Benchmarking data identifies underutilized ("ghost") buildings where occupancy has dropped since the 2019 baseline, enabling proactive outreach to building managers before they ever list on the platform.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                   React Frontend  :3000                        │
│  Home · Listings · Map · Onboarding → Results (Leaflet)        │
│  BuildingIntel · Host/Startup Dashboards · Deal Scout UI       │
└────────────────────────┬───────────────────────────────────────┘
                         │  /api proxy (Vite dev server)
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
┌─────────────────────┐     ┌──────────────────────────┐
│  Spring Boot  :8003 │     │  Flask ML API  :5000     │
│                     │     │                          │
│  AgentController    │     │  /api/ml/predictions     │
│  OrchestratorSvc    │     │  /api/ml/ghost-buildings │
│    ├─ MatcherAgent  │     │  /api/ml/stats           │
│    ├─ AnalystAgent  │     │  /api/ml/predict         │
│    ├─ RiskAgent     │     │                          │
│    └─ OutreachAgent │     │  GradientBoostingModel   │
│  DealScoutSvc       │     │  (sklearn, R²=0.94)      │
│  ClaudeClient ──────┼───► │  Groq API (llama-3.3-70b)│
│  ChicagoApiClient   │     └──────────────────────────┘
│  H2 in-memory DB    │
│  (21 buildings,     │
│   8 hosts, 10       │
│   listings, 10      │
│   startups seeded)  │
└──────────┬──────────┘
           │
           ▼
  Chicago Open Data Portal
  (Energy · Violations · CTA · Licenses)
```

### Request Flow (Onboarding → Results)

1. User fills the Onboarding form (company, sector, days needed, team size, budget, preferred zone)
2. `POST /api/agents/orchestrate` triggers the full pipeline (~60–90 s)
3. **MatcherAgent** scores every active listing against the startup's needs using a deterministic formula, fetches real EUI data from Chicago's Energy Benchmarking API, and asks the LLM to explain each match
4. For each of the top 3 matches, **AnalystAgent** calls 2–3 Chicago APIs via LLM tool-use to produce a building report
5. **RiskAgent** calls business-license and violations APIs to score both parties (0–100 each)
6. **OutreachAgent** uses all gathered data to generate a personalized outreach email and a one-page lease draft
7. The combined result is returned to the frontend and displayed on the Results page with an interactive Leaflet map

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Java, Spring Boot | 11 / 2.7.17 |
| AI client | Groq API — `llama-3.3-70b-versatile` | Free tier |
| ORM | Spring Data JPA + Hibernate | — |
| Database | H2 in-memory (seeded on startup) | — |
| API docs | springdoc-openapi (Swagger UI) | — |
| Frontend | React, Vite, React Router | 19 / 7 / 7 |
| Map | Leaflet + react-leaflet | 1.9.4 / 5.0.0 |
| Charts | Chart.js + react-chartjs-2 | 4.5.1 / 5.2.0 |
| Icons | lucide-react | 0.575.0 |
| Styling | Plain CSS with custom properties | — |
| ML model | Python, scikit-learn, Flask | 3.x / 1.3+ / 3.x |
| Web scraping | Jsoup | — |

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Java | 11+ | OpenJDK or Oracle JDK |
| Maven | 3.6+ | Or use the included `./mvnw` wrapper — no install needed |
| Node.js | 18+ | With npm |
| Python | 3.9+ | For the ML model API |
| pip | 23+ | Python package manager |
| Groq API key | — | Free at [console.groq.com](https://console.groq.com) — no credit card required |

No Docker or external database installation is required. The backend uses an H2 in-memory database that seeds itself automatically.

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/hernaangq/sharedloop.git
cd sharedloop
```

### 2. Start the backend

```bash
cd demo
./mvnw spring-boot:run
# Windows: mvnw.cmd spring-boot:run
```

The server starts on **http://localhost:8003**. H2 is seeded automatically with 21 buildings, 8 hosts, 10 listings, and 10 startups from `data.sql`.

Verify it is running:

```bash
curl http://localhost:8003/api/buildings
```

Swagger UI is available at: `http://localhost:8003/swagger-ui.html`

H2 console (dev only): `http://localhost:8003/h2-console`
- JDBC URL: `jdbc:h2:mem:loopshare`
- Username: `sa` / Password: *(leave empty)*

### 3. Start the ML model API

In a second terminal:

```bash
cd occupancy_model
pip install -r requirements.txt
python api.py
```

The Flask server starts on **http://localhost:5000**.

Verify it is running:

```bash
curl http://localhost:5000/api/ml/health
```

> **Note:** The trained model file (`occupancy_model.pkl`) is already committed to the repository. You do not need to retrain unless you want to update it. To retrain: `python train_model.py`

### 4. Start the frontend

In a third terminal:

```bash
cd frontend
npm install
npm run dev
```

The dev server starts on **http://localhost:3000**.

The Vite proxy automatically routes:
- `/api/ml/*` → `http://localhost:5000` (ML model)
- `/api/*` → `http://localhost:8003` (Spring Boot backend)

### 5. Quick smoke test (no browser needed)

Run the full AI orchestration pipeline with pre-built sample data:

```bash
curl -s http://localhost:8003/api/demo | python3 -m json.tool
```

This runs all four agents end-to-end using a TechStart Chicago startup profile and prints the complete JSON result (~60–90 seconds).

---

## Configuration

### Backend — `demo/src/main/resources/application.properties`

```properties
# ── Server ──────────────────────────────────────────────────────
server.port=8003
server.connection-timeout=120000

# ── H2 in-memory database (recreated on every restart) ──────────
spring.datasource.url=jdbc:h2:mem:loopshare
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.defer-datasource-initialization=true
spring.sql.init.mode=always
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console

# ── AI — Groq (free tier, no credit card required) ──────────────
groq.api.key=YOUR_GROQ_API_KEY_HERE

# ── Swagger UI ───────────────────────────────────────────────────
springdoc.api-docs.path=/api-docs
springdoc.swagger-ui.path=/swagger-ui.html

# ── Deal Scout ───────────────────────────────────────────────────
dealscout.llm.provider=ollama              # mock | ollama | openai
dealscout.enrichment.enabled=true
dealscout.enrichment.min-confidence=0.8
dealscout.enrichment.require-verified-email=true
dealscout.outreach.allow-unverified-drafts=true
```

Replace `YOUR_GROQ_API_KEY_HERE` with a key from [console.groq.com](https://console.groq.com). A demo key is already set for convenience.

**Changing the LLM model:** In `ClaudeClient.java`, find the `model` field and swap `llama-3.3-70b-versatile` for `mixtral-8x7b-32768` or `gemma2-9b-it` if you hit Groq's free-tier rate limits (~6,000 tokens/min).

### Frontend — `frontend/vite.config.js`

```javascript
server: {
  port: 3000,
  proxy: {
    '/api/ml': 'http://localhost:5000',
    '/api':    'http://localhost:8003',
  }
}
```

---

## Usage

### Marketplace browsing

Visit `http://localhost:3000/listings` to browse active desk listings. Each card shows the building, price per desk per day, available days, and floor. Click any listing for full details and a booking form.

### AI-powered matching

1. Navigate to `http://localhost:3000/onboarding`
2. Fill in your startup's company name, sector, days needed per week, team size, monthly budget, and preferred neighborhood zone
3. Click **Find My Match** — the full AI pipeline runs (~60–90 seconds)
4. The **Results** page displays:
   - An interactive Leaflet map centered on the Chicago Loop with numbered pins for each match
   - Three match cards ranked by AI score (0–100), each showing EUI comparison, estimated monthly cost, CO₂ reduction, and risk badges
   - An expandable accordion with the AI-generated outreach email and one-page lease draft
   - An **"Approve & Send"** button (shows a success toast in demo mode; no email is actually sent)
   - A **"Building Intel"** link for the full 10-year EUI trend chart and CO₂ calculator

### Building Intelligence

Navigate to `/intel/:buildingId` to see:
- 10-year EUI trend chart (Chart.js line chart with Loop average as a reference line)
- Corporate and startup risk bars from the RiskAgent
- An interactive CO₂ savings calculator (drag a square-footage slider to see metric tons CO₂e/year saved)

### Host dashboard

Hosts (corporations) can log in to `/host` to manage their listed spaces, view incoming bookings, and track occupancy.

### Startup dashboard

Startups can log in to `/startup` to view confirmed bookings and saved listings.

### Tax estimator

Hosts can navigate to `/taxes` to estimate Illinois Enterprise Zone Act tax benefits from desk-sharing revenue.

---

## Multi-Agent AI System

All four agents share the same underlying `ClaudeClient.runAgentLoop()`, which implements the LLM tool-use loop:

```
messages = [system_prompt, user_message]

repeat up to 10 times:
  POST https://api.groq.com/openai/v1/chat/completions

  if finish_reason == "stop"    → return text content
  if finish_reason == "tool_calls":
    for each tool call in response:
      result = execute tool locally (Chicago API call)
      append { role: "tool", content: result } to messages
    continue loop
```

> **Implementation note:** Tools are defined in Anthropic JSON schema format (`input_schema`). `ClaudeClient` converts them to OpenAI function-calling format before sending to Groq.

---

### MatcherAgent

**Role:** Find the 3 best office listings for a startup using a deterministic scoring formula, then generate a natural-language explanation for each match.

**Data sources:**

| Source | Purpose |
|--------|---------|
| H2 database | All active listings with building, host, price, days, desks |
| Chicago Energy Benchmarking API (`xq83-jr8c`) | Real EUI (kBtu/sq ft) per building |
| Groq LLM (1 call, no tool-use) | Natural-language explanation for each match |

**Scoring formula:**

| Signal | Max pts |
|--------|---------|
| Day overlap (startup days ∩ listing days) | 35 |
| Monthly cost within startup's budget | 25 |
| Enough desks available for the team size | 20 |
| Neighborhood matches preferred zone | 15 |
| Building EUI < 80% of Loop average | 5 |

**Output per match:** `listing_id`, `building_name`, `building_address`, `neighborhood`, `latitude`, `longitude`, `host_company`, `days_available`, `desks_available`, `price_per_desk_per_day`, `floor_number`, `match_score`, `estimated_monthly_cost`, `eui_score`, `avg_eui`, `co2_reduction_tons_year`, `match_explanation`

---

### AnalystAgent

**Role:** Deep building analysis using real Chicago public data. This is a **tool-use agent** — the LLM autonomously decides which APIs to call and in what order.

**Tools available to the LLM:**

| Tool | Chicago API | Returns |
|------|------------|---------|
| `get_energy_data(property_name)` | `xq83-jr8c` | EUI, electricity, GHG emissions by year |
| `get_violations(address)` | `22u3-xenr` | Building code violations (fire, structural, electrical) |
| `get_cta_ridership()` | `r69b-3mnj` | Loop transit ridership (occupancy proxy) |

**Output:** `eui_score`, `avg_eui_for_type`, `violation_count`, `underutilization_score` (0–100), `occupancy_proxy`, `estimated_monthly_savings`, `co2_reduction_tons_year`, `recommendation`

---

### RiskAgent

**Role:** Score the deal risk for both the corporation (host) and the startup (tenant) from 0 to 100. Tool-use agent.

**Tools available to the LLM:**

| Tool | Chicago API | Reveals |
|------|------------|---------|
| `get_business_licenses(company_name)` | `uupf-x98q` | Active city licenses, types, license status |
| `get_violations(address)` | `22u3-xenr` | Liability exposure at the location |

**Output:** `corporate_risk` (0–100), `startup_risk` (0–100), `corporate_risk_factors[]`, `startup_risk_factors[]`, `explanation`

---

### OutreachAgent

**Role:** Generate two ready-to-use documents from all previously gathered data. **No tool calls** — pure LLM generation in a single prompt.

**Context received:** full match data (MatcherAgent), building report (AnalystAgent), risk scores (RiskAgent), startup profile

**Generates:**

1. **Outreach email** — professional email from SharedLoop to the corporation citing real numbers: EUI score vs. Loop average, estimated monthly revenue, Illinois Enterprise Zone Act tax benefit estimate, CO₂ reduction in metric tons/year. Under 300 words.

2. **Lease draft** — one-page desk-sharing agreement including: parties, space description (floor + desk count), schedule (days + 9 am–6 pm), price per desk per day, total monthly cost, 6-month term, 30-day exit clause, liability waiver, and signature placeholders.

**Output:** `{ "email": "...", "lease_draft": "..." }`

---

### OrchestratorService

Coordinates the full pipeline sequentially for a given startup profile:

```
1. MatcherAgent.match(profile)                        → top 3 listings

2. For each of the 3 listings (in parallel within each match):
   a. AnalystAgent.analyze(building_name, address)    → building report
   b. RiskAgent.assess(host, address, startup)        → risk scores
   c. OutreachAgent.generate(match, analysis, profile) → email + lease

3. Return combined result as a single JSON object
```

**Total runtime:** ~60–90 seconds (3 matches × ~3 agent calls each, subject to Groq rate limits).

---

## ML Occupancy Model

The `occupancy_model/` folder contains a standalone Python service that predicts current building occupancy using energy consumption data — without requiring on-site sensors.

### How it works

1. **Training data:** Chicago Energy Benchmarking public dataset — 2019 (pre-pandemic baseline) vs. 2023 (current usage)
2. **Target variable:** `occupancy_pct = min(100, (EUI_2023 / EUI_2019) × 100)`
   A building consuming 60% of its 2019 energy likely has ~60% occupancy
3. **Algorithm:** Gradient Boosting Regressor (scikit-learn)
4. **Scope:** Loop zip codes (60601–60606) — ~50 buildings with both baseline and current data
5. **Validation:** 5-fold cross-validation R² = **0.94**, MAE = **1.67%**

### Feature engineering (16 features)

| Feature | Source |
|---------|--------|
| Gross Floor Area | Benchmarking dataset |
| Building age (2025 − Year Built) | Derived |
| ENERGY STAR Score | Benchmarking dataset |
| Source EUI / Site EUI | Benchmarking dataset |
| Electricity, Natural Gas, Steam, Chilled Water use | Benchmarking dataset |
| Energy mix ratios (electric%, gas%, steam%) | Derived |
| GHG emissions & GHG intensity | Benchmarking dataset |
| EUI drop (2019 − 2023) | Derived |

### API endpoints (Flask, port 5000)

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/ml/health` | Model status, metrics, feature count |
| GET | `/api/ml/predictions` | All Loop buildings with predicted occupancy (sorted by vacancy) |
| GET | `/api/ml/predictions/<id>` | Single building prediction by benchmarking ID |
| GET | `/api/ml/ghost-buildings?threshold=30` | Buildings with vacancy > threshold % |
| POST | `/api/ml/predict` | Custom prediction — pass feature values in request body |
| GET | `/api/ml/stats` | Loop-wide occupancy summary statistics |

### Example: fetch ghost buildings

```bash
# Buildings with >30% vacancy (default threshold)
curl http://localhost:5000/api/ml/ghost-buildings

# Custom threshold
curl "http://localhost:5000/api/ml/ghost-buildings?threshold=40"
```

### Retraining the model

```bash
cd occupancy_model
python train_model.py
```

This downloads nothing — it reads the CSV files already in the folder, trains the model, and overwrites `occupancy_model.pkl`, `model_metadata.json`, and `building_predictions.csv`.

---

## Deal Scout Pipeline

Deal Scout is an agentic outreach pipeline that proactively identifies underutilized buildings from ML predictions and generates contact data + outreach drafts — without waiting for building managers to list on the platform.

### Pipeline stages

```
1. Score buildings by underutilization
   (ML predictions + EUI trend from Chicago Energy API)

2. Enrich contact data
   (web scraping via Jsoup + Chicago Business Licenses API)

3. Verify contact quality
   (confidence threshold ≥ 0.8, email validation, source count ≥ 2)

4. Generate outreach content (LLM)
   - Verified contacts  → draft ready for review
   - Unverified contacts → marked RESEARCH_REQUIRED

5. Queue runs for human review via REST API
```

### Deal Scout API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/deal-scout/runs` | Start a new Deal Scout run |
| GET | `/api/deal-scout/runs` | List all runs with status |
| GET | `/api/deal-scout/runs/:id` | Get a specific run's results |
| PATCH | `/api/deal-scout/runs/:id/status` | Update run status (approve/reject) |
| GET | `/api/deal-scout/predictions` | ML building predictions |
| GET | `/api/deal-scout/proposals` | Generated company proposals |

### Configuration

```properties
# In application.properties
dealscout.llm.provider=ollama           # mock | ollama | openai
dealscout.enrichment.enabled=true
dealscout.enrichment.min-confidence=0.8
dealscout.enrichment.require-verified-email=true
dealscout.outreach.allow-unverified-drafts=true
```

> **Legal note:** The enrichment stage uses web scraping (Jsoup). Review the terms of service of any target websites before enabling enrichment in production.

---

## API Reference

All backend endpoints are prefixed with `/api`. Swagger UI: `http://localhost:8003/swagger-ui.html`

### Marketplace endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/buildings` | List all buildings (21 seeded) |
| GET | `/api/buildings/:id` | Get building by ID |
| POST | `/api/buildings` | Create a building |
| GET | `/api/hosts` | List all hosts |
| GET | `/api/hosts/:id` | Get host by ID |
| GET | `/api/listings` | List all listings |
| GET | `/api/listings/active` | Active listings only |
| GET | `/api/listings/:id` | Get listing by ID |
| GET | `/api/listings/day/:day` | Filter by day (MONDAY, TUESDAY, etc.) |
| POST | `/api/listings` | Create a listing |
| GET | `/api/startups` | List all startups |
| GET | `/api/startups/:id` | Get startup by ID |
| POST | `/api/startups` | Create a startup |
| GET | `/api/bookings` | List all bookings |
| GET | `/api/bookings/:id` | Get booking by ID |
| POST | `/api/bookings` | Create a booking |
| PATCH | `/api/bookings/:id/status` | Update booking status |

### AI agent endpoints

| Method | Path | Request body | Description |
|--------|------|-------------|-------------|
| POST | `/api/agents/match` | `{ company, sector, days[], people, budget, zone }` | Match startup to listings |
| POST | `/api/agents/analyze` | `{ propertyName, address }` | Analyze a building with Chicago data |
| POST | `/api/agents/risk` | `{ corporateName, address, startupName }` | Assess deal risk for both parties |
| POST | `/api/agents/outreach` | `{ match, analysis, startup }` | Generate outreach email + lease draft |
| POST | `/api/agents/orchestrate` | Same as `/match` | Full pipeline (all 4 agents, ~60–90 s) |
| GET | `/api/demo` | — | Full pipeline with TechStart Chicago sample |

### Example: run the matcher

```bash
curl -X POST http://localhost:8003/api/agents/match \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Acme Robotics",
    "sector": "Technology",
    "days": ["MONDAY", "TUESDAY", "WEDNESDAY"],
    "people": 8,
    "budget": 5000,
    "zone": "The Loop"
  }'
```

### Example: full orchestration

```bash
curl -X POST http://localhost:8003/api/agents/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "company": "HealthTech Chicago",
    "sector": "Healthcare",
    "days": ["MONDAY", "WEDNESDAY", "FRIDAY"],
    "people": 5,
    "budget": 4000,
    "zone": "River North"
  }'
```

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing page with hero section and featured listings |
| `/listings` | Listings | Browse all active desk listings with filters |
| `/listings/:id` | ListingDetail | Individual listing detail with booking form |
| `/map` | MapExplore | Interactive map of Loop buildings |
| `/host` | HostDashboard | Manage listed spaces and view incoming bookings *(protected — host role)* |
| `/startup` | StartupDashboard | View confirmed bookings and saved listings *(protected — startup role)* |
| `/profile` | EditProfile | Update user information *(protected)* |
| `/taxes` | TaxEstimator | Estimate Illinois Enterprise Zone Act tax benefits (hosts) |
| `/onboarding` | Onboarding | AI matching form (company, days, budget, preferred zone) |
| `/results` | Results | Leaflet map + 3 ranked match cards with AI-generated outreach and lease |
| `/intel/:buildingId` | BuildingIntel | 10-year EUI trend chart, risk bars, CO₂ savings calculator |
| `/monitor` | LoopMonitor | Loop-wide occupancy monitor dashboard |
| `/find-host` | FindNewHost | Deal Scout tenant finder (ML-powered ghost building discovery) |
| `/signin` | SignIn | User sign-in |
| `/login` | Login | User login |

### Results page features

- **Leaflet map** centered on Chicago Loop (41.8827°N, 87.6327°W) with numbered colored pins per match
- **Match cards** displaying: score ring (0–100), real EUI vs. Loop average, estimated monthly cost, CO₂ reduction in metric tons/year, corporate and startup risk badges
- **Expandable accordion** showing the AI-generated outreach email and lease draft
- **"Approve & Send" button** — success toast shown (no email actually sent in demo mode)
- **"Building Intel" link** — navigates to the full building analysis panel

### BuildingIntel page features

- **10-year EUI trend chart** (Chart.js line chart, simulated backward trend from current real EUI)
- **Loop average EUI** as a dashed reference line
- **Risk bars** for corporate risk and startup risk from RiskAgent
- **CO₂ savings calculator** — drag a square-footage slider to see real-time metric tons CO₂e/year saved vs. a higher-EUI building

---

## Data Model

```
Building
  id, name, address, neighborhood
  floors, totalDesks
  latitude, longitude
  amenities (comma-separated), imageUrl

Host  (corporation offering space)
  id, companyName, industry
  contactEmail, contactPhone
  employeeCount
  building_id → Building

Listing  (a specific desk offering)
  id
  host_id → Host
  building_id → Building
  daysAvailable (comma-separated: "MONDAY,WEDNESDAY")
  desksAvailable, pricePerDeskPerDay
  floorNumber, active, description

Startup  (company seeking space)
  id, companyName, industry
  contactEmail, contactPhone
  teamSize, daysNeeded, desksNeeded

Booking
  id
  listing_id → Listing
  startup_id → Startup
  bookingDate
  desksBooked, totalPrice
  status  (PENDING | CONFIRMED | CANCELLED)
```

**Seed data** (loaded automatically from `demo/src/main/resources/data.sql` on every startup):

| Entity | Count | Examples |
|--------|-------|---------|
| Buildings | 21 | Willis Tower, Aon Center, The Rookery, Old Post Office, 311 S Wacker |
| Hosts | 8 | Kirkland & Ellis, Northern Trust, Morningstar, Hyatt Hotels |
| Listings | 10 | $35–$75 / desk / day, various day combinations |
| Startups | 10 | Rheaply, Tempus AI, SpotHero, Braviant Holdings |
| Bookings | 8 | Mix of CONFIRMED and PENDING |

> **H2 is in-memory.** All data is recreated from `data.sql` on every backend restart. There is no persistent storage.

---

## Project Structure

```
sharedloop/
│
├── demo/                                       # Spring Boot backend (Java 11)
│   ├── pom.xml                                 # Maven dependencies
│   ├── mvnw / mvnw.cmd                         # Maven wrapper (no install needed)
│   └── src/main/
│       ├── java/com/sharedloop/demo/
│       │   ├── DemoApplication.java            # Spring Boot entry point
│       │   ├── config/
│       │   │   ├── AppConfig.java              # RestTemplate bean (30s connect / 120s read)
│       │   │   └── WebConfig.java              # CORS configuration
│       │   ├── controller/
│       │   │   ├── AgentController.java        # /api/agents/* + /api/demo
│       │   │   ├── BuildingController.java
│       │   │   ├── HostController.java
│       │   │   ├── ListingController.java
│       │   │   ├── StartupController.java
│       │   │   ├── BookingController.java
│       │   │   └── DealScoutController.java    # /api/deal-scout/*
│       │   ├── model/                          # JPA entities (Lombok)
│       │   │   ├── Building.java
│       │   │   ├── Host.java
│       │   │   ├── Listing.java
│       │   │   ├── Startup.java
│       │   │   └── Booking.java
│       │   ├── repository/                     # Spring Data JPA repos (1 per entity)
│       │   ├── service/
│       │   │   ├── ClaudeClient.java           # Groq API wrapper — implements tool-use loop
│       │   │   ├── ChicagoApiClient.java       # Chicago Open Data Portal wrapper (4 APIs)
│       │   │   ├── OrchestratorService.java    # Sequential pipeline coordinator
│       │   │   ├── MatcherAgent.java           # DB + Energy API + LLM scoring
│       │   │   ├── AnalystAgent.java           # Tool-use: energy + violations + CTA
│       │   │   ├── RiskAgent.java              # Tool-use: licenses + violations
│       │   │   ├── OutreachAgent.java          # LLM: email + lease draft generation
│       │   │   └── DealScoutService.java       # Ghost building outreach pipeline
│       │   └── dealscout/                      # Deal Scout data classes (8 classes)
│       └── resources/
│           ├── application.properties          # Server, DB, Groq, Deal Scout config
│           └── data.sql                        # H2 seed data (21 buildings, 8 hosts, ...)
│
├── frontend/                                   # React 19 + Vite 7 SPA
│   ├── vite.config.js                          # Dev server (port 3000) + /api proxy
│   ├── package.json                            # npm dependencies
│   └── src/
│       ├── App.jsx                             # React Router routes (15 routes)
│       ├── main.jsx                            # Entry point
│       ├── context/AuthContext.jsx             # User authentication context
│       ├── services/api.js                     # fetch wrappers for all backend endpoints
│       ├── constants/searchOptions.js          # Static filter options
│       ├── utils/buildingImages.js             # Image utility helpers
│       ├── styles/global.css                   # Design tokens + utility classes
│       ├── components/
│       │   ├── Navbar.jsx / .css
│       │   ├── Footer.jsx / .css
│       │   ├── ListingCard.jsx / .css
│       │   ├── DayChips.jsx / .css
│       │   └── ProtectedRoute.jsx              # Role-based auth guard
│       └── pages/
│           ├── Home.jsx / .css
│           ├── Listings.jsx / .css
│           ├── ListingDetail.jsx / .css
│           ├── MapExplore.jsx / .css
│           ├── HostDashboard.jsx
│           ├── StartupDashboard.jsx
│           ├── EditProfile.jsx
│           ├── TaxEstimator.jsx / .css
│           ├── Onboarding.jsx / .css           # AI matching form
│           ├── Results.jsx / .css              # Leaflet map + match cards
│           ├── BuildingIntel.jsx / .css        # Chart.js + CO₂ calculator
│           ├── LoopMonitor.jsx
│           └── FindNewHost.jsx / .css          # Deal Scout UI (ML ghost buildings)
│
├── occupancy_model/                            # Python ML service
│   ├── api.py                                  # Flask REST API (port 5000, 6 endpoints)
│   ├── train_model.py                          # Model training script
│   ├── requirements.txt                        # Python dependencies
│   ├── occupancy_model.pkl                     # Trained Gradient Boosting model
│   ├── model_metadata.json                     # Model metrics + feature list
│   ├── building_predictions.csv               # Pre-computed predictions for all Loop buildings
│   ├── explore_data.py                         # Data exploration / EDA script
│   └── Chicago_Energy_Benchmarking_*.csv       # Training data (2019 baseline + 2023 current)
│
├── test_demo.sh          # Full orchestration smoke test (TechStart Chicago)
├── test_matcher.sh       # POST /api/agents/match
├── test_analyst.sh       # POST /api/agents/analyze (Willis Tower)
├── test_risk.sh          # POST /api/agents/risk (Kirkland & Ellis vs TechStart)
├── CLAUDE.md             # Development workflow guidelines
└── README.md             # This file
```

---

## Test Scripts

Quick curl-based tests from the project root. Requires the backend to be running on port 8003.

```bash
# Full orchestration (~60–90s) — TechStart Chicago pre-built profile
bash test_demo.sh

# Match a startup to listings only
bash test_matcher.sh

# Analyze Willis Tower with Chicago public data
bash test_analyst.sh

# Risk assessment — Kirkland & Ellis (host) vs TechStart Chicago (startup)
bash test_risk.sh
```

Each script pipes through `python3 -m json.tool` for pretty-printed output.

---

## Chicago Open Data APIs

All four datasets are public and require no API key or authentication.

| Dataset | Socrata ID | Used by | What it provides |
|---------|-----------|---------|-----------------|
| Energy Benchmarking — Covered Buildings | `xq83-jr8c` | MatcherAgent, AnalystAgent, ML model | Site/source EUI, ENERGY STAR score, GHG emissions, electricity use by building and year |
| Building Violations | `22u3-xenr` | AnalystAgent, RiskAgent | City-issued code violations: fire safety, structural, electrical |
| CTA Daily Ridership | `r69b-3mnj` | AnalystAgent | Loop transit ridership used as an occupancy proxy for the district |
| Business Licenses | `uupf-x98q` | RiskAgent, Deal Scout | Active business license status and type for Chicago companies |

Base URL pattern: `https://data.cityofchicago.org/resource/{socrata-id}.json`

---

## Notes & Limitations

| Topic | Detail |
|-------|--------|
| **No persistence** | H2 is in-memory only. All data is recreated from `data.sql` on every backend restart. Bookings, new listings, and new buildings are lost on shutdown. |
| **No emails sent** | The "Approve & Send" button shows a success toast in demo mode. `OutreachAgent` content is for human review only. |
| **AI content** | All generated emails, lease drafts, risk scores, and explanations are AI-generated and must be reviewed by a qualified person before use. |
| **Groq rate limits** | The free tier supports ~6,000 tokens/min. If you see 429 errors, add a short `Thread.sleep()` between agent calls in `OrchestratorService.java`, or upgrade to a paid Groq plan. |
| **ML model size** | The Gradient Boosting model is trained on ~50 Loop buildings (those with both 2019 baseline and 2023 data). Predictions outside this distribution may be less reliable. |
| **Web scraping** | Deal Scout enrichment uses Jsoup to scrape contact data. Review the terms of service of any target site before enabling enrichment in a production environment. |
| **Groq API key** | A demo key is committed to the repository for convenience. Replace it with your own key from [console.groq.com](https://console.groq.com) for production use and to avoid shared rate limits. |
| **Swagger UI port** | Swagger UI is at `http://localhost:8003/swagger-ui.html` (not 8000 as referenced in some older documentation). |

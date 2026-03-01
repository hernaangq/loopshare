# SharedLoop

A Chicago Loop desk-sharing marketplace powered by a multi-agent AI system. Corporations with underutilized office space list available desks; startups discover and book them. The AI layer analyzes real Chicago open data to match startups with buildings, assess deal risk, and auto-generate outreach emails and lease drafts.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Multi-Agent AI System](#multi-agent-ai-system)
- [API Reference](#api-reference)
- [Frontend Pages](#frontend-pages)
- [Data Model](#data-model)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Test Scripts](#test-scripts)

---

## Overview

SharedLoop solves two problems at once:

- **Corporations** in Chicago's Loop district have floors of empty desks post-pandemic — a liability cost they can convert into revenue.
- **Startups** need flexible, affordable desk space in a prestigious address without a multi-year lease commitment.

The platform's AI pipeline uses real public data (Chicago Energy Benchmarking, Building Violations, Business Licenses, CTA Ridership) to score building quality, evaluate deal risk on both sides, and produce ready-to-send outreach materials — all in a single API call.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (3000)                 │
│   Onboarding → Results (Leaflet map) → BuildingIntel    │
└───────────────────────┬─────────────────────────────────┘
                        │ /api proxy
┌───────────────────────▼─────────────────────────────────┐
│               Spring Boot Backend (8000)                 │
│                                                          │
│  AgentController                                         │
│       │                                                  │
│  OrchestratorService                                     │
│       ├── MatcherAgent    (DB + Chicago Energy API)      │
│       ├── AnalystAgent    (Chicago Energy + Violations)  │
│       ├── RiskAgent       (Chicago Licenses + Violations)│
│       └── OutreachAgent   (LLM generation only)          │
│                                                          │
│  ClaudeClient  ──────────► Groq API (llama-3.3-70b)     │
│  ChicagoApiClient ────────► Chicago Open Data Portal    │
│  H2 in-memory DB ─────────► Buildings / Listings / ...  │
└─────────────────────────────────────────────────────────┘
```

### Request Flow

1. User fills the Onboarding form and submits
2. `POST /api/agents/orchestrate` triggers the full pipeline (~60–90 s)
3. **MatcherAgent** scores every active listing against the startup's needs, fetches EUI from Chicago's energy API, asks Groq to explain each match
4. For each of the top 3 matches, **AnalystAgent** calls 2–3 Chicago APIs via LLM tool-use to produce a building report
5. **RiskAgent** calls business-license and violations APIs to score both parties
6. **OutreachAgent** uses all gathered data to generate a personalized email and lease draft
7. The combined result is returned to the frontend and displayed on the Results page

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 11, Spring Boot 2.7.17 |
| AI client | Groq API — `llama-3.3-70b-versatile` (free tier) |
| ORM | Spring Data JPA + Hibernate |
| Database | H2 in-memory (seeded on startup) |
| API docs | springdoc-openapi (Swagger UI) |
| Frontend | React 19, Vite 7, React Router 7 |
| Map | Leaflet 1.9 + react-leaflet 4 |
| Charts | Chart.js 4 + react-chartjs-2 |
| Icons | lucide-react |
| Styling | Plain CSS with CSS custom properties |

---

## Prerequisites

- Java 11+
- Maven (or use the included `./mvnw` wrapper)
- Node.js 18+ and npm
- A free [Groq API key](https://console.groq.com) — no credit card required

---

## Getting Started

### 1. Clone the repo

```bash
git clone <repo-url>
cd sharedloop
```

### 2. Configure the Groq API key

The key is already set in `demo/src/main/resources/application.properties`. To use your own:

```properties
# demo/src/main/resources/application.properties
groq.api.key=gsk_your_key_here
```

Or set it as an environment variable before starting the backend:

```bash
export GROQ_API_KEY=gsk_...
```

### 3. Start the backend

```bash
cd demo
./mvnw spring-boot:run
```

The server starts on **http://localhost:8000**. H2 is seeded automatically with 12 buildings, 8 hosts, 10 listings, and 10 startups.

Verify it's running:
```bash
curl http://localhost:8000/api/buildings
```

### 4. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The dev server starts on **http://localhost:3000**.

### 5. Try the AI demo (no form needed)

```bash
curl -s http://localhost:8000/api/demo | python3 -m json.tool
```

This runs the full orchestrator with a pre-built TechStart Chicago profile and prints the complete JSON result. Takes about 60–90 seconds.

---

## Multi-Agent AI System

All four agents share the same underlying `ClaudeClient.runAgentLoop()` which implements the tool-use loop:

```
messages = [system_prompt, user_message]

repeat up to 10 times:
  POST https://api.groq.com/openai/v1/chat/completions

  if finish_reason == "stop"  → return text content
  if finish_reason == "tool_calls":
    for each tool call:
      result = execute tool locally
      append { role: "tool", content: result } to messages
    continue loop
```

---

### MatcherAgent

**Role:** Find the 3 best office listings for a startup using a deterministic scoring formula, then explain each match in natural language.

**Consults:**
| Source | What for |
|--------|----------|
| H2 database | All active listings with building, host, price, days, desks |
| Chicago Energy Benchmarking API (`xq83-jr8c`) | Real EUI (kBtu/sq ft) per building |
| Groq (1 LLM call, no tools) | Natural-language explanation for each match |

**Scoring formula (pure math):**

| Signal | Max pts |
|--------|---------|
| Day overlap (startup days ∩ listing days) | 35 |
| Monthly cost within budget | 25 |
| Enough desks for the team | 20 |
| Neighborhood matches preferred zone | 15 |
| Building EUI < 80% of Loop average | 5 |

**Output fields per match:** `listing_id`, `building_name`, `building_address`, `neighborhood`, `latitude`, `longitude`, `host_company`, `days_available`, `desks_available`, `price_per_desk_per_day`, `floor_number`, `match_score`, `estimated_monthly_cost`, `eui_score`, `avg_eui`, `co2_reduction_tons_year`, `match_explanation`

---

### AnalystAgent

**Role:** Deep building analysis using real Chicago public data. This is a **tool-use agent** — the LLM decides which APIs to call and when.

**Consults (via LLM-driven tool calls):**
| Tool | Chicago API | What it returns |
|------|------------|-----------------|
| `get_energy_data(property_name)` | `resource/xq83-jr8c.json` | EUI, electricity, GHG emissions by year |
| `get_violations(address)` | `resource/22u3-xenr.json` | Building code violations (fire, structural, electrical) |
| `get_cta_ridership()` | `resource/r69b-3mnj.json` | Loop transit ridership (occupancy proxy) |

**Output:** `eui_score`, `avg_eui_for_type`, `violation_count`, `underutilization_score` (0–100), `occupancy_proxy`, `estimated_monthly_savings`, `co2_reduction_tons_year`, `recommendation`

---

### RiskAgent

**Role:** Score the deal risk for both the corporation (host) and the startup (tenant). Tool-use agent.

**Consults (via LLM-driven tool calls):**
| Tool | Chicago API | What it reveals |
|------|------------|-----------------|
| `get_business_licenses(company_name)` | `resource/uupf-x98q.json` | Active city licenses, types, status |
| `get_violations(address)` | `resource/22u3-xenr.json` | Liability risk at the location |

**Output:** `corporate_risk` (0–100), `startup_risk` (0–100), `corporate_risk_factors[]`, `startup_risk_factors[]`, `explanation`

---

### OutreachAgent

**Role:** Generate two ready-to-use documents from all gathered data. **No tool calls** — pure LLM generation.

**Context passed in:** full match data, AnalystAgent output, startup profile

**Generates:**

1. **Outreach email** — professional email from SharedLoop to the corporation citing real numbers: EUI score vs. Loop average, estimated monthly revenue, Illinois Enterprise Zone Act tax benefit estimate, CO₂ reduction in metric tons/year. Under 300 words.

2. **Lease draft** — one-page desk-sharing agreement with parties, space description (floor + desks), schedule (days + 9am–6pm), price per desk per day, total monthly cost, 6-month term, 30-day exit clause, liability waiver, signature placeholders.

**Output:** `{ "email": "...", "lease_draft": "..." }`

---

### OrchestratorService

Runs the full pipeline sequentially for a given startup profile:

```
1. MatcherAgent.match(profile)                     → top 3 listings
2. For each listing:
   a. AnalystAgent.analyze(building_name, address) → building report
   b. RiskAgent.assess(host, address, startup)     → risk scores
   c. OutreachAgent.generate(match, analysis, profile) → email + lease
3. Return combined result
```

Total runtime: **60–90 seconds** (3 matches × ~3 agent calls each).

---

## API Reference

All endpoints are prefixed with `/api`. Swagger UI available at `http://localhost:8000/swagger-ui.html`.

### Marketplace Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/buildings` | List all buildings |
| GET | `/api/buildings/:id` | Get building by ID |
| GET | `/api/listings/active` | List active listings |
| GET | `/api/listings/:id` | Get listing by ID |
| GET | `/api/listings/day/:day` | Filter by day (MONDAY, etc.) |
| GET | `/api/hosts` | List all hosts |
| GET | `/api/startups` | List all startups |
| GET/POST | `/api/bookings` | Get or create bookings |

### AI Agent Endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/agents/match` | `{ company, sector, days[], people, budget, zone }` | Match startup to listings |
| POST | `/api/agents/analyze` | `{ propertyName, address }` | Analyze a building |
| POST | `/api/agents/risk` | `{ corporateName, address, startupName }` | Assess deal risk |
| POST | `/api/agents/outreach` | `{ match, analysis, startup }` | Generate email + lease |
| POST | `/api/agents/orchestrate` | Same as `/match` | Full pipeline (all 4 agents) |
| GET | `/api/demo` | — | Full pipeline with TechStart Chicago sample data |

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing page with featured listings |
| `/listings` | Listings | Browse all active desk listings |
| `/listings/:id` | ListingDetail | Individual listing with booking |
| `/map` | MapExplore | Google Maps view of Loop buildings |
| `/host` | HostDashboard | Manage your listed spaces |
| `/startup` | StartupDashboard | Your bookings and saved listings |
| `/onboarding` | Onboarding | AI matching form (company, days, budget, zone) |
| `/results` | Results | Leaflet map + 3 match cards with AI-generated content |
| `/intel/:id` | BuildingIntel | EUI trend chart, risk bars, CO₂ calculator |

### Results Page Features

- **Leaflet map** centered on Chicago Loop (41.8827, -87.6327) with numbered colored pins for each match
- **Match cards** with score ring, EUI, estimated cost, CO₂ reduction, risk badges
- **Expandable accordion** showing the generated outreach email and lease draft
- **"Approve & Send" button** — success toast (no real email sent in demo)
- **"Building Intel" link** — navigates to the full building analysis panel

### BuildingIntel Page Features

- **10-year EUI trend chart** (Chart.js line chart, simulated trend from current EUI)
- **Loop average EUI** as a dashed reference line
- **Risk bars** for corporate and startup risk from RiskAgent
- **CO₂ savings calculator** — drag a square-footage slider to see real-time metric tons CO₂e/year saved vs. a higher-EUI building

---

## Data Model

```
Building
  id, name, address, neighborhood
  floors, totalDesks
  latitude, longitude
  amenities (comma-separated), imageUrl

Host (corporation offering space)
  id, companyName, industry, contactEmail
  building_id → Building

Listing (a specific offering)
  id, host_id → Host, building_id → Building
  daysAvailable (comma-separated: "MONDAY,WEDNESDAY")
  desksAvailable, pricePerDeskPerDay
  floorNumber, active, description

Startup (company seeking space)
  id, name, sector, contactEmail
  teamSize, budget

Booking
  id, listing_id → Listing, startup_id → Startup
  startDate, endDate
  totalDesks, totalCost
  status (PENDING | CONFIRMED | CANCELLED)
```

**Seed data** (loaded on every startup from `data.sql`):

| Entity | Count | Examples |
|--------|-------|---------|
| Buildings | 12 | Willis Tower, Aon Center, The Rookery, Old Post Office |
| Hosts | 8 | Kirkland & Ellis, Northern Trust, Morningstar, Hyatt |
| Listings | 10 | $35–$75/desk/day, various day combinations |
| Startups | 10 | Rheaply, Tempus AI, SpotHero, Braviant Holdings |
| Bookings | 8 | Mix of CONFIRMED and PENDING |

---

## Project Structure

```
sharedloop/
├── demo/                          # Spring Boot backend
│   ├── pom.xml
│   └── src/main/java/com/sharedloop/demo/
│       ├── config/
│       │   ├── AppConfig.java     # RestTemplate bean (30s connect / 120s read)
│       │   └── WebConfig.java     # CORS configuration
│       ├── controller/
│       │   ├── AgentController.java     # /api/agents/* + /api/demo
│       │   ├── BuildingController.java
│       │   ├── ListingController.java
│       │   ├── HostController.java
│       │   ├── StartupController.java
│       │   └── BookingController.java
│       ├── model/                 # JPA entities (Lombok)
│       ├── repository/            # Spring Data JPA repos
│       └── service/
│           ├── ClaudeClient.java        # Groq agentic loop (tool_use)
│           ├── ChicagoApiClient.java    # Chicago Open Data API wrapper
│           ├── OrchestratorService.java # Sequential pipeline coordinator
│           ├── MatcherAgent.java        # DB + Energy API + LLM scoring
│           ├── AnalystAgent.java        # Tool-use: energy + violations + CTA
│           ├── RiskAgent.java           # Tool-use: licenses + violations
│           └── OutreachAgent.java       # LLM email + lease generation
│
├── frontend/                      # Vite + React frontend
│   ├── vite.config.js             # Dev server + /api proxy → :8000
│   ├── package.json
│   └── src/
│       ├── App.jsx                # Routes
│       ├── main.jsx               # Entry point
│       ├── services/api.js        # fetch wrappers for all endpoints
│       ├── components/
│       │   ├── Navbar.jsx / .css
│       │   ├── Footer.jsx / .css
│       │   ├── ListingCard.jsx / .css
│       │   └── DayChips.jsx / .css
│       ├── pages/
│       │   ├── Home.jsx / .css
│       │   ├── Listings.jsx / .css
│       │   ├── ListingDetail.jsx / .css
│       │   ├── MapExplore.jsx / .css
│       │   ├── HostDashboard.jsx
│       │   ├── StartupDashboard.jsx
│       │   ├── Onboarding.jsx / .css   # AI matching form
│       │   ├── Results.jsx / .css      # Leaflet map + match cards
│       │   └── BuildingIntel.jsx / .css # Chart.js + CO₂ calculator
│       └── styles/global.css      # Design tokens + utility classes
│
├── test_demo.sh       # GET /api/demo (full pipeline, TechStart Chicago)
├── test_matcher.sh    # POST /api/agents/match
├── test_analyst.sh    # POST /api/agents/analyze (Willis Tower)
├── test_risk.sh       # POST /api/agents/risk (Kirkland & Ellis)
└── README.md
```

---

## Configuration

**`demo/src/main/resources/application.properties`**

```properties
# Server
server.port=8000
server.connection-timeout=120000

# H2 in-memory database (recreated on each restart)
spring.datasource.url=jdbc:h2:mem:loopshare
spring.jpa.hibernate.ddl-auto=create-drop
spring.sql.init.mode=always
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console

# AI (Groq — free tier, no credit card)
groq.api.key=your_key_here

# Swagger
springdoc.api-docs.path=/api-docs
springdoc.swagger-ui.path=/swagger-ui.html
```

**H2 Console** — available at `http://localhost:8000/h2-console` during development. JDBC URL: `jdbc:h2:mem:loopshare`, username: `sa`, password: (empty).

**Groq model** — `llama-3.3-70b-versatile`. Free tier supports ~6,000 tokens/min. For higher throughput, swap to `mixtral-8x7b-32768` or `gemma2-9b-it` in `ClaudeClient.java`.

---

## Test Scripts

Quick curl-based tests from the project root. Requires the backend to be running.

```bash
# Full orchestration (60–90s) — TechStart Chicago sample data
bash test_demo.sh

# Match a startup to listings
bash test_matcher.sh

# Analyze Willis Tower
bash test_analyst.sh

# Risk assessment — Kirkland & Ellis vs TechStart Chicago
bash test_risk.sh
```

Each script pipes output through `python3 -m json.tool` for pretty-printing.

---

## Chicago Open Data APIs Used

All APIs are public and require no authentication.

| Dataset | Socrata ID | Used by |
|---------|-----------|---------|
| Energy Benchmarking — Covered Buildings | `xq83-jr8c` | MatcherAgent, AnalystAgent |
| Building Violations | `22u3-xenr` | AnalystAgent, RiskAgent |
| CTA Daily Ridership | `r69b-3mnj` | AnalystAgent |
| Business Licenses | `uupf-x98q` | RiskAgent |

Base URL: `https://data.cityofchicago.org/resource/{id}.json`

---

## Notes

- **H2 is in-memory** — all data is recreated from `data.sql` on every backend restart. There is no persistent storage.
- **No emails are sent** — the "Approve & Send" button shows a success toast only. OutreachAgent content is for review only.
- **AI content requires review** — all generated emails, lease drafts, risk scores, and explanations are AI-generated and should be reviewed by a human before use.
- **Groq rate limits** — the free tier has token-per-minute limits. If you hit them, add a short delay between agent calls in `OrchestratorService.run()` or upgrade to a paid plan.

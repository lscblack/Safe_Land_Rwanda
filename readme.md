# SafeLand Rwanda — Project README

This README contains:
- Step-by-step installation and run instructions
- Related project files and folders
- Placeholder for 5-minute demo video link
- Placeholder for deployed app / installable package links
- Testing results with screenshot placeholders
- Analysis, Discussion, and Recommendations/Future Work sections

---

## 1) Project Overview

SafeLand Rwanda is a land and property verification platform integrating:
- GIS parcel visualization and analysis
- NLA-related title and parcel data checks
- Risk scoring and AI-assisted recommendation features
- Backend APIs for parcel, property, and geospatial operations
- AI-based Optical Character Recognition

---

## 2) Step-by-Step Installation & Run Guide

## 2.1 Prerequisites

Install the following on your machine:
- Node.js (LTS recommended)
- pnpm
- Python 3.10+
- PostgreSQL + PostGIS
- Git



---

## 2.2 Clone and Open Project

```bash
git clone https://github.com/lscblack/Safe_Land_Rwanda
cd Safe_Land_Rwanda
```

---

## 2.3 Backend Setup (offchain)

1. Move to backend folder:

```bash
cd offchain
```

2. Create and activate virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Configure environment variables:
- Copy `.env.example` to `.env`
- Update DB/API keys as required

```bash
cp .env.example .env
```

5. Create database and enable PostGIS:

```sql
CREATE DATABASE safeland;
\c safeland
CREATE EXTENSION IF NOT EXISTS postgis;
```

6. Run backend server:

```bash
python main.py
```

Backend default (update if different):
- `http://localhost:8000`

---

## 2.4 Frontend Setup (gisMap)

1. Move to frontend folder:

```bash
cd ../gisMap
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure environment:
- Create/update `.env` with API base URL

Example:
```env
VITE_API_BASE_URL=http://localhost:8000
```

4. Start development server:

```bash
pnpm run dev
```

Frontend default (update if different):
- `http://localhost:5173`


---

## 3) Related Files and Folders

## 3.1 Root-level Modules
- `gisMap/` — main GIS web frontend
- `offchain/` — FastAPI backend (business logic, APIs, Postgres/PostGIS)


## 3.2 Important Frontend Files (`gisMap/`)
- `src/components/maps_comp/mainM.tsx` — main parcel verification and map flow
- `src/components/ml/Chatbot.tsx` — assistant/chat interactions
- `src/instance/mainAxios.ts` — API instance configuration

## 3.3 Important Backend Files (`offchain/`)
- `main.py` — backend entrypoint
- `api/routes/mapping_routes.py` — mapping + geospatial endpoints
- `data/models/mapping.py` — mapping model
- `data/database/database.py` — DB session/config

---

## 4) 5-Minute Demo Video



- Demo video link (5 minutes):
  - https://drive.google.com/drive/folders/1TGTrfxH2im1g-A8mpIyr0H5f8gQ4Foh0?usp=sharing

demo flow summary:
1. Parcel verification upload flow
2. Map parcel discovery and point-in-polygon click lookup
3. Parcel risk insights and legal checks
4. Land-usage partitioning visualization
5. AI recommendation and factor transparency

---

## 5) Deployed Version / Installable Package

- Deployed app URL:
  - https://safe-land-rwanda.vercel.app


---

## 6) Testing Results (Screenshots with Relevant Demos)

Add real screenshots below and replace placeholder captions/paths.

### 6.1 Core Feature Demos

1. Parcel verification + extracted UPI
	- Screenshot: `docs/screenshots/core-01-verify-upi.png`
2. Parcels Overlaping
	- Screenshot: `docs/screenshots/core-05-ai-recommendation.png`
3. Point click on map -> parcel found by lat/lng (PostGIS)
	- Screenshot: `docs/screenshots/core-02-point-lookup.png`

4. Legal issue warning popup / status overview NLA Data
	- Avaliable: `docs/screenshots/core-03-legal-status.png`
  	- Not Available: `docs/screenshots/core-03-legal-status.png`

5. Land-usage partition rendering with focused labels
	- Screenshot: `docs/screenshots/core-04-land-usage-partition.png`

6. AI recommendation with explainable factors
	- Screenshot: `docs/screenshots/core-05-ai-recommendation.png`



### 6.2 Different Testing Strategies

#### A) Functional Testing
- Scenario: Verify parcel upload and map rendering
- Expected: Parcel appears and state updates correctly
- Result: **[PASS/FAIL + notes]**
- Screenshot: `docs/screenshots/test-functional.png`

#### B) Integration Testing
- Scenario: Frontend click -> backend lookup -> parcel response
- Expected: Matching parcel returned from PostGIS
- Result: **[PASS/FAIL + notes]**
- Screenshot: `docs/screenshots/test-integration.png`

#### C) Usability Testing
- Scenario: User understands risk panel and recommendation factors
- Expected: Clear interpretation with low confusion
- Result: **[PASS/FAIL + notes]**
- Screenshot: `docs/screenshots/test-usability.png`

#### D) Regression Testing
- Scenario: New features do not break existing map interactions
- Expected: Existing flows stable
- Result: **[PASS/FAIL + notes]**
- Screenshot: `docs/screenshots/test-regression.png`

---

## 7) Functionality with Different Data Values

Provide test cases with low/medium/high complexity data.

| Case | Input Data | Expected Behavior | Actual Result | Status |
|---|---|---|---|---|
| 1 | Clean parcel (no legal issues) | Low risk, clear status | **[ADD RESULT]** | **[PASS/FAIL]** |
| 2 | Parcel with overlap | Warning + higher risk | **[ADD RESULT]** | **[PASS/FAIL]** |
| 3 | Parcel near wetland | Risk reasons include environmental proximity | **[ADD RESULT]** | **[PASS/FAIL]** |
| 4 | Irregular geometry parcel | Shape-risk reason appears | **[ADD RESULT]** | **[PASS/FAIL]** |
| 5 | Multiple planned land uses | Correct partition and labels | **[ADD RESULT]** | **[PASS/FAIL]** |

Screenshots:
- `docs/screenshots/data-values-01.png`
- `docs/screenshots/data-values-02.png`
- `docs/screenshots/data-values-03.png`

---

## 8) Performance on Different Hardware/Software Specs

Document performance evidence from different environments.

| Environment | Specs | Scenario | Metric | Result |
|---|---|---|---|---|
| A | Low-end laptop | Initial map load | Time to interactive | **[ADD]** |
| B | Mid-range laptop | Parcel click + lookup | Response time | **[ADD]** |
| C | High-end desktop | Heavy multi-parcel rendering | FPS / UI smoothness | **[ADD]** |

Software variants to report:
- Browser comparison (Chrome/Firefox/Edge)
- Backend mode (dev/prod)
- DB size variation (small/medium/large dataset)

Performance screenshots:
- `docs/screenshots/perf-01.png`
- `docs/screenshots/perf-02.png`
- `docs/screenshots/perf-03.png`

---

## 9) Analysis

Provide a detailed analysis of results vs objectives agreed with supervisor.

### 9.1 Objectives vs Outcomes

| Objective (Proposal) | Achieved? | Evidence | Notes |
|---|---|---|---|
| Real-time parcel verification | **[YES/PARTIAL/NO]** | **[EVIDENCE]** | **[NOTES]** |
| GIS-based risk assessment | **[YES/PARTIAL/NO]** | **[EVIDENCE]** | **[NOTES]** |
| Transparent recommendation | **[YES/PARTIAL/NO]** | **[EVIDENCE]** | **[NOTES]** |

### 9.2 Key Findings
- **[FINDING 1]**
- **[FINDING 2]**
- **[FINDING 3]**

### 9.3 Gaps / Missed Targets
- **[GAP 1]**
- **[GAP 2]**
- Root causes and constraints:
  - **[CAUSES]**

---

## 10) Discussion

Detailed discussion with supervisor on milestones and impact.

### 10.1 Milestone Importance
- Milestone 1: **Core parcel verification and GIS mapping integration (PDF title extraction + UPI-based parcel visualization).** Impact: Established the project’s foundational trust layer by allowing users to validate land records and immediately view official parcel geometry on the map.
- Milestone 2: **Geospatial legal-risk and safety assessment features (overlap checks, legal flags, point-in-polygon lookup, and issue notices).** Impact: Reduced fraud exposure by turning complex legal/geospatial checks into understandable, real-time warnings for users before transactions.
- Milestone 3: **Explainable AI recommendation and land-usage partitioning visualization.** Impact: Increased user confidence and decision quality through transparent recommendation factors and clear parcel zoning insights, improving practical usability for buyers, agents, and supervisors.

### 10.2 Impact of Results
- Technical impact: The project delivered an integrated geospatial verification workflow combining OCR-based title extraction, PostGIS point-in-polygon lookup, legal-status checks, risk scoring, and explainable AI recommendations in a single platform. This improved system interoperability between frontend map interactions and backend geospatial services, reduced manual validation steps, and increased the reliability of parcel-level decision support.
- User/community impact: End users can now verify parcel authenticity, visualize overlaps, understand legal constraints, and compare parcels with transparent recommendation factors before making financial commitments. This directly improves public awareness of land fraud indicators, supports safer land transactions, and strengthens confidence in digital property verification tools.
- Institutional/operational impact: The platform provides a practical digital process that institutions can use to standardize pre-transaction checks, document risk evidence, and reduce disputes caused by boundary conflicts or hidden legal issues. Operationally, this supports faster case handling, clearer auditability of parcel checks, and better coordination between technical teams and supervisory stakeholders.

### 10.3 Lessons Learned
- Accurate geospatial decisions require combining multiple signals (legal status, overlaps, shape quality, and nearby environmental/infrastructure context) rather than relying on a single indicator.
- User trust increases significantly when AI outputs are transparent, so recommendation panels should always show the exact checked factors and clear reasons behind each risk score or suggested parcel.

---

## 11) Recommendations & Future Work

### 11.1 Recommendations to Community
- Promote mandatory pre-transaction digital parcel verification (UPI + map-based legal checks) for buyers, sellers, and local brokers before any land payment is made.
- Encourage local authorities and cooperatives to run public awareness sessions on boundary overlap, caveat, mortgage, and in-transaction status to reduce fraud and informal misinformation.
- Adopt community reporting and feedback channels for suspicious parcel records so validated field findings can improve registry quality and strengthen trust in digital land systems.

### 11.2 Future Work
- Add richer historical transaction risk signals
- Add offline geospatial caching for low connectivity
- Improve model calibration with field-verified labels
- Expand mobile-first workflows and multilingual UX support
- Build supervisor-facing analytics dashboards for outcomes tracking

---


## 13) Quick Submission Checklist

- [ ] Installation steps verified on a clean machine
- [ ] 5-minute demo video link added
- [ ] Deployed/app package link added
- [ ] All screenshot placeholders replaced
- [ ] Testing strategy evidence completed
- [ ] Data-value test table completed
- [ ] Performance comparison completed
- [ ] Analysis, Discussion, Recommendations finalized with supervisor


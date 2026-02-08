# Safe Land Rwanda

## Description
Safe Land Rwanda is a comprehensive platform for real estate market analysis, property management, and secure land transactions in Rwanda. The project leverages advanced data science (including time-series forecasting with Meta Prophet), a modern React frontend, and robust backend services to empower users with actionable insights and seamless property operations.

## GitHub Repository
[https://github.com/lscblack/Safe_Land_Rwanda](https://github.com/lscblack/Safe_Land_Rwanda)

## Setup Instructions

### Prerequisites
- Node.js (v16+ recommended)
- Python 3.8+
- pnpm (for frontend)
- pip (for backend and ML)

### 1. Clone the Repository
```
git clone https://github.com/lscblack/Safe_Land_Rwanda.git
cd Safe_Land_Rwanda
```

### 2. Frontend Setup (Vite + React)
```
cd Clients
pnpm install
pnpm run dev
```
- The frontend is deployed on Vercel for production.

### 3. Backend Setup (FastAPI/Flask, Offchain)
```
cd ../offchain
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py / uvicorn main:app --reload --port 8000
```

### 4. Machine Learning/Analytics (Jupyter, Prophet)
```
cd ../ml/market_trends
pip install -r ../../offchain/requirements.txt
jupyter notebook
```
- Open `NewMarketTrends.ipynb` for time-series forecasting and analytics.

### 5. Onchain (Smart Contracts)
```
cd ../onchain
pip install -r requirements.txt
# For contract deployment:
# truffle migrate --network <network>
uvicorn app.main:app --reload --port 8080
```

## Designs
- **Figma Mockups:** [Figma UI/UX Design](https://www.figma.com/proto/aQExFrnDLYFwrURYwvdzXE/Builder-Figma-to-Code-Plugin-Playground--Copy-?node-id=2517-392&t=taAa4NAiVusyD7Jc-1)
- **Screenshots:**
  - ![Home Page](Clients/public/image.png)
  - ![Dashbaord](Clients/public/image-1.png)

- **Architecture:**
  - ![System Diagram](Clients/public/art.png)


## Deployment Plan
- **Frontend:**
  - Deployed on [Vercel safeLand Link](https://safe-land-rwanda.vercel.app/) for production. All pushes to `main` auto-deploy.
- **Backend:**
  - Local development with FastAPI. Production deployment (Docker, cloud, or VPS) is planned for the next phase.
- **Onchain:**
  - Smart contracts managed in the `onchain` directory. Deployment scripts provided.
- **ML/Analytics:**
  - Jupyter notebooks for analytics and forecasting. Results can be integrated into the dashboard.

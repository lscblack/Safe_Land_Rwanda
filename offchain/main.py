"""
SafeLand API - FastAPI Backend
Main application entry point with Professional Landing Page
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

# --- Database & Route Imports ---
# Assuming these modules exist in your project structure
from data.database.database import init_db, close_db
from api.routes import (
    user_routes, 
    external_routes, 
    frontend_auth_routes, 
    otp_routes, 
    liip_routes, 
    notification_routes, 
    property_routes, 
    agency_routes
)

# --- Configuration ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Ensure assets directory exists
os.makedirs("assets", exist_ok=True)

# --- Lifecycle Manager ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for database connections"""
    logger.info("Starting up SafeLand API...")
    await init_db()
    yield
    logger.info("Shutting down SafeLand API...")
    await close_db()

# --- App Initialization ---
app = FastAPI(
    title="SafeLand API",
    description="Secure Digital Land Registry & Market Intelligence Platform",
    version="1.0.0",
    contact={
        "name": "SafeLand Tech Team",
        "email": "dev@safeland.rw"
    },
    license_info={
        "name": "Proprietary",
    },
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Origin", "Content-Type", "Accept", "Authorization"],
)

# --- Static Files ---
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

# --- Router Registration ---
app.include_router(frontend_auth_routes.router, prefix="/api/frontend", tags=["Frontend Auth"])
app.include_router(user_routes.router, prefix="/api/user", tags=["User Management"])
app.include_router(property_routes.router, prefix="/api/property", tags=["Property & GIS"])
app.include_router(agency_routes.router, prefix="/api/agency", tags=["Agency & Broker Portal"])
app.include_router(external_routes.router, prefix="/api/external", tags=["External Integrations"])
app.include_router(liip_routes.router, prefix="/api/liip", tags=["LIIP Systems"])
app.include_router(notification_routes.router, prefix="/api/notifications", tags=["Notification Center"])
app.include_router(otp_routes.router, prefix="/otp", tags=["Security & OTP"])

# --- Root Landing Page ---
@app.get("/", response_class=HTMLResponse, tags=["General"])
async def root():
    html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeLand API | Digital Land Registry</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        :root {
            --color-navy: #0a162e;
            --color-blue: #395d91;
            --color-slate: #f8fafc;
        }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: var(--color-slate); }
        .bg-navy { background-color: var(--color-navy); }
        .text-navy { color: var(--color-navy); }
        .bg-primary { background-color: var(--color-blue); }
        .text-primary { color: var(--color-blue); }
        .border-primary { border-color: var(--color-blue); }
        
        /* Flat Design Cards */
        .feature-card {
            background: white;
            border: 1px solid #e2e8f0;
            transition: all 0.2s ease;
        }
        .feature-card:hover {
            border-color: var(--color-blue);
            transform: translateY(-2px);
        }
        .hero-pattern {
            background-color: var(--color-navy);
            background-image: linear-gradient(var(--color-blue) 1px, transparent 1px),
            linear-gradient(90deg, var(--color-blue) 1px, transparent 1px);
            background-size: 40px 40px;
            background-position: center center;
        }
    </style>
</head>
<body class="antialiased text-gray-800 flex flex-col min-h-screen">

    <header class="hero-pattern relative overflow-hidden text-white pt-20 pb-24">
        <div class="absolute inset-0 bg-navy opacity-90"></div>
        <div class="container mx-auto px-6 relative z-10 text-center">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-400/30 bg-blue-900/20 text-blue-200 text-xs font-bold uppercase tracking-widest mb-6">
                <span class="w-2 h-2 rounded-full bg-green-400"></span> System Online
            </div>
            <h1 class="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                SafeLand <span class="text-blue-400">API</span>
            </h1>
            <p class="text-xl text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
                The backbone of Rwanda's modern real estate ecosystem. 
                Powering property verification, GIS market intelligence, and secure land transactions.
            </p>
            
            <div class="mt-10 flex justify-center gap-4">
                <a href="/docs" class="px-8 py-4 bg-primary hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    API Documentation
                </a>
                <a href="/redoc" class="px-8 py-4 bg-white/5 border border-white/20 hover:bg-white/10 text-white font-bold rounded-lg transition-colors">
                    ReDoc Reference
                </a>
            </div>
        </div>
    </header>

    <main class="flex-grow container mx-auto px-6 -mt-16 relative z-20">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div class="feature-card p-8 rounded-xl">
                <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-primary mb-4">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                </div>
                <h3 class="text-lg font-bold text-navy mb-2">Property Engine</h3>
                <p class="text-sm text-gray-500">Full CRUD for land parcels, verification status, and dynamic attribute management.</p>
            </div>

            <div class="feature-card p-8 rounded-xl">
                <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-primary mb-4">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                </div>
                <h3 class="text-lg font-bold text-navy mb-2">GIS Intelligence</h3>
                <p class="text-sm text-gray-500">Spatial data analysis, zoning overlays, and market trend predictions.</p>
            </div>

            <div class="feature-card p-8 rounded-xl">
                <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-primary mb-4">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
                <h3 class="text-lg font-bold text-navy mb-2">Agency Portal</h3>
                <p class="text-sm text-gray-500">Broker management, RDB certificate verification, and user role assignment.</p>
            </div>

            <div class="feature-card p-8 rounded-xl">
                <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-primary mb-4">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h3 class="text-lg font-bold text-navy mb-2">Secure Auth</h3>
                <p class="text-sm text-gray-500">JWT Authentication, OTP verification, and RBAC implementation.</p>
            </div>

        </div>

        <div class="py-16 text-center">
            <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Powered By</span>
            <div class="flex justify-center items-center gap-8 mt-4 opacity-60 grayscale hover:grayscale-0 transition-all">
                <span class="text-xl font-bold text-navy">FastAPI</span>
                <span class="text-xl font-bold text-navy">PostgreSQL</span>
                <span class="text-xl font-bold text-navy">Docker</span>
            </div>
        </div>
    </main>

    <footer class="bg-white border-t border-gray-200 mt-auto">
        <div class="container mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center">
            <p class="text-sm text-gray-500">© 2026 SafeLand Rwanda. All rights reserved.</p>
            <div class="flex gap-6 mt-4 md:mt-0 text-sm font-medium text-primary">
                <a href="#" class="hover:underline">System Status</a>
                <a href="#" class="hover:underline">Support</a>
                <a href="#" class="hover:underline">Privacy</a>
            </div>
        </div>
    </footer>

</body>
</html>
    """
    return HTMLResponse(content=html_content)


@app.get("/health", tags=["General"])
async def health_check():
    """Health check endpoint for monitoring tools"""
    return {"status": "healthy", "service": "safeland-api", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3000,
        reload=True,
        log_level="info"
    )
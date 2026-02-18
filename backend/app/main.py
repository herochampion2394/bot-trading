from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from contextlib import asynccontextmanager
import logging
import sys
import traceback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from app.database import engine, Base, SessionLocal
    from app.api import routes_auth, routes_binance, routes_bots, routes_trades
    from app.services.trading_engine import TradingEngine
    logger.info("All imports successful")
except Exception as e:
    logger.error(f"Import error: {e}")
    logger.error(traceback.format_exc())
    sys.exit(1)

scheduler = AsyncIOScheduler()

async def scheduled_trading_execution():
    """
    Scheduled task that runs every hour to execute trades.
    """
    logger.info("Starting scheduled trading execution")
    db = SessionLocal()
    try:
        engine = TradingEngine(db)
        await engine.execute_hourly_trading()
    except Exception as e:
        logger.error(f"Error in scheduled trading: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting bot-trading application")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Start scheduler - runs every hour at minute 0
    scheduler.add_job(
        scheduled_trading_execution,
        CronTrigger(hour='*', minute='0'),
        id='hourly_trading',
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started - trading will execute every hour")
    
    yield
    
    # Shutdown
    logger.info("Shutting down scheduler")
    scheduler.shutdown()

app = FastAPI(
    title="Bot Trading API",
    description="Automated crypto trading bot with Binance integration",
    version="1.0.0",
    lifespan=lifespan,
    root_path=""
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(routes_auth.router)
app.include_router(routes_binance.router)
app.include_router(routes_bots.router)
app.include_router(routes_trades.router)

@app.get("/")
async def root():
    return {
        "message": "Bot Trading API",
        "status": "running",
        "scheduler_running": scheduler.running
    }

@app.get("/health")
async def health():
return {
        "status": "healthy",
        "scheduler": scheduler.running,
        "next_run": str(scheduler.get_jobs()[0].next_run_time) if scheduler.get_jobs() else None
    }

@app.post("/api/trading/execute-now")
async def execute_trading_now(current_user: dict = Depends(routes_auth.get_current_user)):
    """
    Manual trigger for trading execution (requires authentication).
    """
    db = SessionLocal()
    try:
        engine = TradingEngine(db)
        await engine.execute_hourly_trading()
        return {"message": "Trading execution completed"}
    except Exception as e:
        logger.error(f"Error in manual trading execution: {e}")
        return {"error": str(e)}
    finally:
        db.close()

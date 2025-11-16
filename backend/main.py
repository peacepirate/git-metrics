"""
FastAPI backend for Git Metrics application.
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncio
from contextlib import asynccontextmanager

from database import MetricsDatabase
from git_providers import get_provider
from metrics_engine import MetricsEngine


# Global instances
db = MetricsDatabase()
metrics_engine = MetricsEngine(db)

# Pydantic models for request/response
class RepositoryCreate(BaseModel):
    name: str
    url: str
    provider: str  # 'github' or 'bitbucket'
    access_token: Optional[str] = None


class RepositoryResponse(BaseModel):
    id: int
    name: str
    url: str
    provider: str
    last_sync: Optional[str]
    is_active: bool


class SyncRequest(BaseModel):
    repo_id: int
    full_sync: bool = False  # If True, fetch all commits; if False, only new ones


class MetricsResponse(BaseModel):
    repo_id: int
    metrics: Dict[str, Any]


# Background task tracking
sync_tasks = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    # Startup
    print("Starting Git Metrics API...")
    yield
    # Shutdown
    print("Shutting down Git Metrics API...")


app = FastAPI(
    title="Git Metrics API",
    description="API for analyzing Git repository metrics and performance",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Git Metrics API",
        "version": "1.0.0",
        "endpoints": {
            "repositories": "/api/repositories",
            "metrics": "/api/metrics/{repo_id}",
            "sync": "/api/sync"
        }
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# Repository Management Endpoints

@app.get("/api/repositories", response_model=List[Dict[str, Any]])
async def list_repositories(active_only: bool = True):
    """Get all configured repositories."""
    repos = db.get_repositories(active_only=active_only)
    return repos


@app.post("/api/repositories", response_model=Dict[str, Any])
async def create_repository(repo: RepositoryCreate):
    """Add a new repository."""
    try:
        # Validate repository access
        provider = get_provider(repo.provider)
        if not provider.validate_access(repo.url, repo.access_token):
            raise HTTPException(
                status_code=400,
                detail="Cannot access repository. Check URL and access token."
            )

        # Get repository info
        repo_info = provider.get_repository_info(repo.url, repo.access_token)

        # Add to database
        repo_id = db.add_repository(
            name=repo_info.get('name', repo.name),
            url=repo.url,
            provider=repo.provider,
            access_token=repo.access_token
        )

        return {
            "id": repo_id,
            "name": repo_info.get('name', repo.name),
            "message": "Repository added successfully",
            "info": repo_info
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding repository: {str(e)}")


@app.get("/api/repositories/{repo_id}")
async def get_repository(repo_id: int):
    """Get repository details."""
    repos = db.get_repositories(active_only=False)
    repo = next((r for r in repos if r['id'] == repo_id), None)

    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    return repo


@app.delete("/api/repositories/{repo_id}")
async def delete_repository(repo_id: int):
    """Delete (deactivate) a repository."""
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE repositories SET is_active = 0 WHERE id = ?", (repo_id,))

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Repository not found")

    return {"message": "Repository deactivated successfully"}


# Sync Endpoints

def sync_repository_task(repo_id: int, full_sync: bool = False):
    """Background task to sync repository data."""
    try:
        sync_tasks[repo_id] = {"status": "running", "progress": 0}

        # Get repository details
        repos = db.get_repositories(active_only=False)
        repo = next((r for r in repos if r['id'] == repo_id), None)

        if not repo:
            sync_tasks[repo_id] = {"status": "error", "message": "Repository not found"}
            return

        # Get provider
        provider = get_provider(repo['provider'])

        # Determine since date
        since = None
        if not full_sync and repo['last_sync']:
            since = datetime.fromisoformat(repo['last_sync'])

        sync_tasks[repo_id] = {"status": "running", "progress": 10, "message": "Fetching commits..."}

        # Fetch commits
        commits = provider.fetch_commits(repo['url'], repo['access_token'], since=since)

        sync_tasks[repo_id] = {"status": "running", "progress": 50, "message": f"Processing {len(commits)} commits..."}

        # Store commits in database
        commit_count = 0
        for commit_data in commits:
            commit_id = db.add_commit(repo_id, commit_data)

            if commit_id:  # Only process if it's a new commit
                commit_count += 1
                # Add file changes
                for file_data in commit_data.get('files', []):
                    db.add_file_change(commit_id, file_data)

        sync_tasks[repo_id] = {"status": "running", "progress": 80, "message": "Updating metrics..."}

        # Update aggregated metrics
        db.update_contributor_metrics(repo_id)
        db.update_file_hotspots(repo_id)
        db.update_daily_metrics(repo_id)

        # Update last sync time
        db.update_repository_sync(repo_id)

        sync_tasks[repo_id] = {
            "status": "completed",
            "progress": 100,
            "message": f"Sync completed. Processed {commit_count} new commits.",
            "commits_processed": commit_count
        }

    except Exception as e:
        sync_tasks[repo_id] = {
            "status": "error",
            "message": f"Sync failed: {str(e)}"
        }


@app.post("/api/sync")
async def sync_repository(sync_req: SyncRequest, background_tasks: BackgroundTasks):
    """Start syncing a repository (background task)."""
    # Check if already syncing
    if sync_req.repo_id in sync_tasks and sync_tasks[sync_req.repo_id].get('status') == 'running':
        return {
            "message": "Sync already in progress",
            "status": sync_tasks[sync_req.repo_id]
        }

    # Start background sync
    background_tasks.add_task(sync_repository_task, sync_req.repo_id, sync_req.full_sync)

    return {
        "message": "Sync started",
        "repo_id": sync_req.repo_id
    }


@app.get("/api/sync/{repo_id}/status")
async def get_sync_status(repo_id: int):
    """Get sync status for a repository."""
    if repo_id not in sync_tasks:
        return {"status": "not_started"}

    return sync_tasks[repo_id]


# Metrics Endpoints

@app.get("/api/metrics/{repo_id}/summary")
async def get_repository_summary(repo_id: int):
    """Get overall repository statistics."""
    summary = db.get_repository_summary(repo_id)
    if not summary or summary.get('total_commits', 0) == 0:
        raise HTTPException(
            status_code=404,
            detail="No data found for this repository. Please sync first."
        )
    return summary


@app.get("/api/metrics/{repo_id}/contributors")
async def get_contributors(repo_id: int, limit: int = 20):
    """Get contributor statistics."""
    contributors = db.get_contributor_stats(repo_id, limit)
    return {"contributors": contributors}


@app.get("/api/metrics/{repo_id}/hotspots")
async def get_hotspots(repo_id: int, limit: int = 20):
    """Get file hotspots (frequently changed files)."""
    hotspots = db.get_file_hotspots(repo_id, limit)
    return {"hotspots": hotspots}


@app.get("/api/metrics/{repo_id}/daily")
async def get_daily_metrics(repo_id: int, days: int = 30):
    """Get daily metrics for trend analysis."""
    daily = db.get_daily_metrics(repo_id, days)
    return {"daily_metrics": daily}


@app.get("/api/metrics/{repo_id}/churn")
async def get_code_churn(repo_id: int, days: int = 30):
    """Get code churn analysis."""
    churn = metrics_engine.calculate_code_churn(repo_id, days)
    return churn


@app.get("/api/metrics/{repo_id}/velocity")
async def get_velocity_trends(repo_id: int, weeks: int = 12):
    """Get development velocity trends."""
    velocity = metrics_engine.calculate_velocity_trends(repo_id, weeks)
    return velocity


@app.get("/api/metrics/{repo_id}/bus-factor")
async def get_bus_factor(repo_id: int):
    """Get bus factor (knowledge distribution) analysis."""
    bus_factor = metrics_engine.calculate_bus_factor(repo_id)
    return bus_factor


@app.get("/api/metrics/{repo_id}/commit-patterns")
async def get_commit_patterns(repo_id: int):
    """Get commit pattern analysis (time of day, day of week)."""
    patterns = metrics_engine.calculate_commit_patterns(repo_id)
    return patterns


@app.get("/api/metrics/{repo_id}/quality")
async def get_quality_indicators(repo_id: int):
    """Get code quality indicators."""
    quality = metrics_engine.calculate_code_quality_indicators(repo_id)
    return quality


@app.get("/api/metrics/{repo_id}/contributor-insights")
async def get_contributor_insights(repo_id: int):
    """Get detailed contributor insights."""
    insights = metrics_engine.calculate_contributor_insights(repo_id)
    return insights


@app.get("/api/metrics/{repo_id}/comprehensive")
async def get_comprehensive_metrics(repo_id: int):
    """Get all metrics in one comprehensive report."""
    # Check if data exists
    summary = db.get_repository_summary(repo_id)
    if not summary or summary.get('total_commits', 0) == 0:
        raise HTTPException(
            status_code=404,
            detail="No data found for this repository. Please sync first."
        )

    metrics = metrics_engine.get_comprehensive_metrics(repo_id)
    return metrics


# Cross-Repository Metrics Endpoints

@app.get("/api/metrics/all/summary")
async def get_all_repositories_summary():
    """Get summary metrics across all repositories."""
    return metrics_engine.get_all_repositories_summary()


@app.get("/api/metrics/all/comparison")
async def get_repository_comparison(metric: str = "commits"):
    """Compare repositories by specific metric (commits, contributors, churn)."""
    valid_metrics = ["commits", "contributors", "churn"]
    if metric not in valid_metrics:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid metric. Must be one of: {', '.join(valid_metrics)}"
        )
    return {"metric": metric, "repositories": metrics_engine.get_repository_comparison(metric)}


@app.get("/api/metrics/all/contributors")
async def get_cross_repository_contributors(limit: int = 50):
    """Get contributors across all repositories."""
    return {"contributors": metrics_engine.get_cross_repository_contributors(limit)}


@app.get("/api/metrics/all/churn")
async def get_cross_repository_churn(days: int = 30):
    """Get code churn metrics across all repositories."""
    return metrics_engine.get_cross_repository_churn(days)


@app.get("/api/metrics/contributor/{email:path}")
async def get_contributor_details(email: str):
    """Get detailed metrics for a specific contributor across all repositories."""
    contributor = metrics_engine.get_contributor_by_email(email)
    if not contributor:
        raise HTTPException(
            status_code=404,
            detail="Contributor not found"
        )
    return contributor


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Backend Setup Guide

This guide provides detailed instructions for setting up and running the Git Metrics backend API server.

## Prerequisites

### Required Software
- **Python 3.8 or higher** - [Download Python](https://www.python.org/downloads/)
- **pip** - Python package manager (comes with Python)
- **virtualenv** (recommended) - For isolated Python environments

### Verify Installation
```bash
python --version  # Should show 3.8 or higher
pip --version
```

## Installation

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Create Virtual Environment (Recommended)

**On macOS/Linux:**
```bash
python -m venv venv
source venv/bin/activate
```

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

You should see `(venv)` in your terminal prompt, indicating the virtual environment is active.

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

This will install:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation
- `requests` - HTTP client for API calls
- `python-dateutil` - Date parsing utilities

### 4. Verify Installation
```bash
python -c "import fastapi; print(fastapi.__version__)"
```

## Configuration

### Database Setup
The application uses SQLite and will automatically create the database file on first run:
- Database file: `git_metrics.db`
- Location: Backend directory root
- Schema: Auto-initialized on startup

### Environment Variables (Optional)

Create a `.env` file in the backend directory for configuration:

```bash
# .env
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_PATH=git_metrics.db
LOG_LEVEL=info

# GitHub rate limit (optional - for monitoring)
GITHUB_TOKEN=your_github_token_here

# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Note:** The application works without a `.env` file using default values.

## Running the Server

### Development Mode

**Option 1: Using Python directly**
```bash
python main.py
```

**Option 2: Using Uvicorn (recommended for development)**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The `--reload` flag enables auto-restart on code changes.

### Production Mode
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Verify Server is Running
Open your browser and navigate to:
- API Docs: http://localhost:8000/docs
- Alternative Docs: http://localhost:8000/redoc
- Health Check: http://localhost:8000/api/health

## API Documentation

Once the server is running, FastAPI provides interactive API documentation:

### Swagger UI
Visit: `http://localhost:8000/docs`
- Interactive API explorer
- Test endpoints directly in browser
- View request/response schemas

### ReDoc
Visit: `http://localhost:8000/redoc`
- Clean, organized documentation
- Searchable endpoints
- Download OpenAPI spec

## Database Management

### Reset Database
If you need to start fresh:
```bash
# Stop the server first
rm git_metrics.db
python main.py  # Will recreate the database
```

### Backup Database
```bash
cp git_metrics.db git_metrics_backup_$(date +%Y%m%d).db
```

### View Database Contents
Using SQLite command-line tool:
```bash
sqlite3 git_metrics.db
```

Common queries:
```sql
-- List all tables
.tables

-- View repositories
SELECT * FROM repositories;

-- Count commits per repository
SELECT r.name, COUNT(c.id) as commit_count
FROM repositories r
LEFT JOIN commits c ON r.id = c.repo_id
GROUP BY r.id;

-- Exit
.quit
```

## Development

### Code Structure
```
backend/
├── main.py              # FastAPI application & endpoints
├── database.py          # Database models & operations
├── git_providers.py     # GitHub/Bitbucket integration
├── metrics_engine.py    # Metrics calculation logic
├── requirements.txt     # Python dependencies
└── git_metrics.db      # SQLite database (created on run)
```

### Adding a New Endpoint

1. Open `main.py`
2. Add your endpoint function:
```python
@app.get("/api/your-endpoint")
async def your_endpoint():
    return {"message": "Hello"}
```
3. The server will auto-reload if running with `--reload`

### Adding a New Metric

1. Open `metrics_engine.py`
2. Add your calculation method to the `MetricsEngine` class:
```python
def calculate_your_metric(self, repo_id: int) -> Dict[str, Any]:
    with self.db.get_connection() as conn:
        cursor = conn.cursor()
        # Your SQL query
        cursor.execute("SELECT ...")
        return {"result": cursor.fetchall()}
```
3. Add an endpoint in `main.py` to expose it

### Running Tests
```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill the process or use a different port
uvicorn main:app --port 8001
```

### Import Errors
```bash
# Ensure virtual environment is activated
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate  # Windows

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Database Locked Error
```bash
# Stop all instances of the server
# Remove any stale database locks
rm git_metrics.db-journal
```

### GitHub/Bitbucket API Rate Limits

**GitHub:**
- Without token: 60 requests/hour
- With token: 5,000 requests/hour
- Solution: Add access token when configuring repository

**Bitbucket:**
- Without token: 60 requests/hour
- With token: 1,000 requests/hour
- Solution: Add app password when configuring repository

### Memory Issues with Large Repositories
For repositories with 10,000+ commits:

1. Limit initial sync in `git_providers.py`:
```python
def fetch_commits(self, repo_url: str, access_token: Optional[str] = None,
                 since: Optional[datetime] = None, limit: int = 1000):
    # Change limit to 5000 or 10000
```

2. Use incremental syncs after initial setup

## Performance Optimization

### Database Indexes
The schema includes indexes on frequently queried columns. To add more:
```python
# In database.py init_database()
cursor.execute("CREATE INDEX IF NOT EXISTS idx_custom ON table(column)")
```

### Caching
Consider adding Redis for caching frequently accessed metrics:
```bash
pip install redis
```

### Async Operations
The application uses FastAPI's async capabilities. For long-running operations, use background tasks:
```python
from fastapi import BackgroundTasks

@app.post("/api/long-task")
async def long_task(background_tasks: BackgroundTasks):
    background_tasks.add_task(some_long_function)
    return {"status": "started"}
```

## Security Considerations

### Access Tokens
- Never commit access tokens to version control
- Store tokens in environment variables or secure vaults
- Rotate tokens periodically

### CORS Configuration
Update allowed origins in `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],  # Specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Database Encryption
For sensitive data, consider encrypting the SQLite database:
```bash
pip install sqlcipher3
```

## Deployment

### Production Checklist
- [ ] Set environment variables in `.env`
- [ ] Use production ASGI server (Uvicorn with workers)
- [ ] Configure CORS for production domains
- [ ] Set up reverse proxy (Nginx/Apache)
- [ ] Enable HTTPS
- [ ] Set up monitoring and logging
- [ ] Configure database backups
- [ ] Set resource limits

### Using Docker
Create `Dockerfile`:
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t git-metrics-backend .
docker run -p 8000:8000 git-metrics-backend
```

## Logging

### Enable Detailed Logging
```python
# Add to main.py
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
```

### View Logs
```bash
# Real-time logs
tail -f logs/app.log

# Search logs
grep "ERROR" logs/app.log
```

## Monitoring

### Health Check Endpoint
The API includes a health check endpoint:
```bash
curl http://localhost:8000/api/health
```

### Monitor Background Tasks
Track sync operations:
```bash
curl http://localhost:8000/api/sync/{repo_id}/status
```

## Support

For issues or questions:
1. Check this setup guide
2. Review main README.md
3. Check API documentation at `/docs`
4. Open an issue on GitHub

## Quick Reference

```bash
# Start development server
uvicorn main:app --reload

# Start with custom port
uvicorn main:app --port 8001

# Start production server
uvicorn main:app --workers 4

# Reset database
rm git_metrics.db && python main.py

# View API docs
open http://localhost:8000/docs
```

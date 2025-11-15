# Git Metrics - Repository Performance Analytics

A comprehensive git repository analytics platform that visualizes key performance metrics based on code changes. Track developer productivity, code quality, collaboration patterns, and team health with beautiful, interactive visualizations.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8%2B-blue)
![React](https://img.shields.io/badge/react-18.2-blue)

## Features

### 📊 Comprehensive Metrics

- **Developer Productivity**
  - Lines of code added/removed/changed
  - Commit frequency and patterns
  - Individual contributor statistics
  - Role identification (Core, Regular, Occasional)

- **Code Quality Indicators**
  - Code churn analysis
  - File hotspots (frequently changed files)
  - Average commit size metrics
  - Commit message quality scoring

- **Team Health & Collaboration**
  - Bus factor calculation
  - Knowledge distribution analysis
  - Collaboration patterns
  - Active contributor tracking

- **Temporal Analysis**
  - Development velocity trends
  - Commit patterns by time of day
  - Commit patterns by day of week
  - Weekly/daily metrics tracking

### 🎨 Beautiful Visualizations

- Interactive charts powered by Apache ECharts
- Real-time metric updates
- Responsive design with dark mode
- Multiple chart types: line, bar, pie, and more

### 🔌 Integration Support

- **GitHub** - Full support for public and private repositories
- **Bitbucket** - Complete Bitbucket Cloud integration
- Easy to extend for other git providers

## Technology Stack

### Backend
- **FastAPI** - Modern, fast Python web framework
- **SQLite** - Local database for metrics storage
- **Python 3.8+** - Core programming language
- **PyGithub & Bitbucket APIs** - Repository data fetching

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Apache ECharts** - Professional charting library
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing

## Installation

### Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn package manager

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Start the FastAPI server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install Node dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Usage

### Adding a Repository

1. Navigate to the home page
2. Click "Add Repository"
3. Fill in the repository details:
   - **Name**: A friendly name for your repository
   - **URL**: The git repository URL (e.g., `https://github.com/username/repo`)
   - **Provider**: Select GitHub or Bitbucket
   - **Access Token**: (Optional for public repos, required for private)
     - GitHub: Create a personal access token at https://github.com/settings/tokens
     - Bitbucket: Create an app password at https://bitbucket.org/account/settings/app-passwords/

4. Click "Add Repository"

### Syncing Repository Data

1. On the home page, find your repository card
2. Click "Sync Repository" to fetch commits and calculate metrics
3. Monitor the progress bar during sync
4. Once complete, navigate to the dashboard to view metrics

### Understanding the Metrics

#### Dashboard
- **Total Commits**: Overall commit count
- **Contributors**: Number of unique contributors
- **Lines Changed**: Total code changes (additions + deletions)
- **Bus Factor**: Minimum critical contributors (lower = higher risk)
- **Velocity Trends**: Development activity over time
- **Commit Patterns**: When team members are most active

#### Contributors Page
- **Top Contributors**: Ranked by commits and impact
- **Contribution Distribution**: Percentage breakdown
- **Role Classification**: Core, Regular, and Occasional contributors
- **Detailed Statistics**: Per-contributor metrics

#### Code Churn Page
- **File Churn**: Files with most changes (potential instability)
- **Developer Churn**: Individual change patterns
- **High Risk Files**: Files with single ownership
- **Bus Factor Analysis**: Knowledge distribution risks

## API Endpoints

### Repository Management
- `GET /api/repositories` - List all repositories
- `POST /api/repositories` - Add a new repository
- `GET /api/repositories/{id}` - Get repository details
- `DELETE /api/repositories/{id}` - Remove a repository

### Synchronization
- `POST /api/sync` - Start repository sync
- `GET /api/sync/{repo_id}/status` - Get sync status

### Metrics
- `GET /api/metrics/{repo_id}/summary` - Repository summary
- `GET /api/metrics/{repo_id}/contributors` - Contributor stats
- `GET /api/metrics/{repo_id}/hotspots` - File hotspots
- `GET /api/metrics/{repo_id}/churn` - Code churn analysis
- `GET /api/metrics/{repo_id}/velocity` - Velocity trends
- `GET /api/metrics/{repo_id}/bus-factor` - Bus factor metrics
- `GET /api/metrics/{repo_id}/commit-patterns` - Commit patterns
- `GET /api/metrics/{repo_id}/comprehensive` - All metrics

## Database Schema

The application uses SQLite with the following main tables:

- **repositories** - Repository configurations
- **commits** - Individual commit records
- **file_changes** - File-level change details
- **contributors** - Aggregated contributor metrics
- **file_hotspots** - Frequently changed files
- **daily_metrics** - Daily aggregated statistics

## Configuration

### Access Tokens

For private repositories or to avoid rate limits:

**GitHub:**
1. Go to https://github.com/settings/tokens
2. Generate a new token (classic)
3. Select scopes: `repo` (for private repos) or `public_repo` (for public only)
4. Copy and save the token

**Bitbucket:**
1. Go to https://bitbucket.org/account/settings/app-passwords/
2. Create app password
3. Select permissions: `Repositories: Read`
4. Copy and save the password

## Development

### Running in Development Mode

**Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`

## Key Metrics Explained

### Bus Factor
The minimum number of team members who would need to leave before project knowledge is at risk. Lower numbers indicate concentrated knowledge. Industry recommendation: aim for 3+.

### Code Churn
Lines added + deleted over time. High churn may indicate:
- Active development areas
- Unstable or buggy code
- Code that needs refactoring

### File Hotspots
Files changed frequently. Can indicate:
- Core system files
- Complex or coupled code
- Potential technical debt areas

### Commit Patterns
Understanding when your team commits helps:
- Identify work-life balance issues
- Optimize meeting schedules
- Understand global team distribution

## Troubleshooting

### API Rate Limits
If you hit GitHub/Bitbucket rate limits:
- Add an access token to increase limits
- For GitHub: 60 req/hour (unauthenticated) vs 5,000 req/hour (authenticated)

### Slow Sync Times
For large repositories:
- First sync takes longer (fetches all commits)
- Subsequent syncs are incremental
- Consider limiting the initial sync period in `git_providers.py`

### Database Issues
If you need to reset the database:
```bash
cd backend
rm git_metrics.db
python main.py  # Will recreate database
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Roadmap

Future enhancements:
- [ ] Pull request metrics
- [ ] Code review statistics
- [ ] Issue tracking integration
- [ ] Jira/Linear integration
- [ ] Team comparison views
- [ ] Export reports (PDF/CSV)
- [ ] Slack/Teams notifications
- [ ] GitLab support
- [ ] Docker deployment
- [ ] Multi-repository dashboards

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

Built with ❤️ using FastAPI, React, and Apache ECharts

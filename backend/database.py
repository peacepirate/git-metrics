"""
Database models and schema for git metrics storage.
"""
import sqlite3
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import contextmanager


class MetricsDatabase:
    """SQLite database for storing git metrics."""

    def __init__(self, db_path: str = "git_metrics.db"):
        self.db_path = db_path
        self.init_database()

    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init_database(self):
        """Initialize database schema."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Repositories table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS repositories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    url TEXT NOT NULL UNIQUE,
                    provider TEXT NOT NULL,
                    access_token TEXT,
                    last_sync TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1
                )
            """)

            # Commits table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS commits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    repo_id INTEGER NOT NULL,
                    sha TEXT NOT NULL,
                    author_name TEXT NOT NULL,
                    author_email TEXT NOT NULL,
                    committer_name TEXT,
                    committer_email TEXT,
                    message TEXT,
                    commit_date TIMESTAMP NOT NULL,
                    lines_added INTEGER DEFAULT 0,
                    lines_deleted INTEGER DEFAULT 0,
                    lines_changed INTEGER DEFAULT 0,
                    files_changed INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (repo_id) REFERENCES repositories(id),
                    UNIQUE(repo_id, sha)
                )
            """)

            # File changes table (for detailed analysis)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS file_changes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    commit_id INTEGER NOT NULL,
                    file_path TEXT NOT NULL,
                    lines_added INTEGER DEFAULT 0,
                    lines_deleted INTEGER DEFAULT 0,
                    status TEXT,
                    FOREIGN KEY (commit_id) REFERENCES commits(id)
                )
            """)

            # Contributors table (aggregated metrics)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS contributors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    repo_id INTEGER NOT NULL,
                    author_name TEXT NOT NULL,
                    author_email TEXT NOT NULL,
                    total_commits INTEGER DEFAULT 0,
                    total_lines_added INTEGER DEFAULT 0,
                    total_lines_deleted INTEGER DEFAULT 0,
                    total_lines_changed INTEGER DEFAULT 0,
                    first_commit_date TIMESTAMP,
                    last_commit_date TIMESTAMP,
                    files_touched INTEGER DEFAULT 0,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (repo_id) REFERENCES repositories(id),
                    UNIQUE(repo_id, author_email)
                )
            """)

            # File hotspots (frequently changed files)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS file_hotspots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    repo_id INTEGER NOT NULL,
                    file_path TEXT NOT NULL,
                    change_count INTEGER DEFAULT 0,
                    total_lines_changed INTEGER DEFAULT 0,
                    unique_contributors INTEGER DEFAULT 0,
                    last_changed TIMESTAMP,
                    FOREIGN KEY (repo_id) REFERENCES repositories(id),
                    UNIQUE(repo_id, file_path)
                )
            """)

            # Daily metrics (for trend analysis)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS daily_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    repo_id INTEGER NOT NULL,
                    date DATE NOT NULL,
                    commits INTEGER DEFAULT 0,
                    lines_added INTEGER DEFAULT 0,
                    lines_deleted INTEGER DEFAULT 0,
                    active_contributors INTEGER DEFAULT 0,
                    files_changed INTEGER DEFAULT 0,
                    FOREIGN KEY (repo_id) REFERENCES repositories(id),
                    UNIQUE(repo_id, date)
                )
            """)

            # Create indexes for better query performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_commits_repo ON commits(repo_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_commits_author ON commits(author_email)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_commits_date ON commits(commit_date)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_file_changes_commit ON file_changes(commit_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_file_changes_path ON file_changes(file_path)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_contributors_repo ON contributors(repo_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_hotspots_repo ON file_hotspots(repo_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_daily_metrics_repo_date ON daily_metrics(repo_id, date)")

    def add_repository(self, name: str, url: str, provider: str, access_token: Optional[str] = None) -> int:
        """Add a new repository."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO repositories (name, url, provider, access_token)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(url) DO UPDATE SET
                   name = excluded.name,
                   provider = excluded.provider,
                   access_token = excluded.access_token,
                   is_active = 1""",
                (name, url, provider, access_token)
            )
            return cursor.lastrowid

    def get_repositories(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get all repositories."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM repositories"
            if active_only:
                query += " WHERE is_active = 1"
            cursor.execute(query)
            return [dict(row) for row in cursor.fetchall()]

    def update_repository_sync(self, repo_id: int):
        """Update last sync timestamp for a repository."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE repositories SET last_sync = ? WHERE id = ?",
                (datetime.now(), repo_id)
            )

    def add_commit(self, repo_id: int, commit_data: Dict[str, Any]) -> Optional[int]:
        """Add a commit record."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(
                    """INSERT INTO commits
                       (repo_id, sha, author_name, author_email, committer_name,
                        committer_email, message, commit_date, lines_added,
                        lines_deleted, lines_changed, files_changed)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        repo_id,
                        commit_data['sha'],
                        commit_data['author_name'],
                        commit_data['author_email'],
                        commit_data.get('committer_name'),
                        commit_data.get('committer_email'),
                        commit_data.get('message', ''),
                        commit_data['commit_date'],
                        commit_data.get('lines_added', 0),
                        commit_data.get('lines_deleted', 0),
                        commit_data.get('lines_changed', 0),
                        commit_data.get('files_changed', 0)
                    )
                )
                return cursor.lastrowid
            except sqlite3.IntegrityError:
                # Commit already exists
                return None

    def add_file_change(self, commit_id: int, file_data: Dict[str, Any]):
        """Add a file change record."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO file_changes
                   (commit_id, file_path, lines_added, lines_deleted, status)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    commit_id,
                    file_data['file_path'],
                    file_data.get('lines_added', 0),
                    file_data.get('lines_deleted', 0),
                    file_data.get('status', 'modified')
                )
            )

    def update_contributor_metrics(self, repo_id: int):
        """Recalculate and update contributor metrics."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO contributors
                (repo_id, author_name, author_email, total_commits,
                 total_lines_added, total_lines_deleted, total_lines_changed,
                 first_commit_date, last_commit_date, files_touched, updated_at)
                SELECT
                    repo_id,
                    author_name,
                    author_email,
                    COUNT(*) as total_commits,
                    SUM(lines_added) as total_lines_added,
                    SUM(lines_deleted) as total_lines_deleted,
                    SUM(lines_changed) as total_lines_changed,
                    MIN(commit_date) as first_commit_date,
                    MAX(commit_date) as last_commit_date,
                    COUNT(DISTINCT (
                        SELECT file_path FROM file_changes
                        WHERE commit_id = commits.id
                    )) as files_touched,
                    CURRENT_TIMESTAMP as updated_at
                FROM commits
                WHERE repo_id = ?
                GROUP BY author_email
            """, (repo_id,))

    def update_file_hotspots(self, repo_id: int):
        """Recalculate file hotspots."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO file_hotspots
                (repo_id, file_path, change_count, total_lines_changed,
                 unique_contributors, last_changed)
                SELECT
                    c.repo_id,
                    fc.file_path,
                    COUNT(*) as change_count,
                    SUM(fc.lines_added + fc.lines_deleted) as total_lines_changed,
                    COUNT(DISTINCT c.author_email) as unique_contributors,
                    MAX(c.commit_date) as last_changed
                FROM file_changes fc
                JOIN commits c ON fc.commit_id = c.id
                WHERE c.repo_id = ?
                GROUP BY fc.file_path
            """, (repo_id,))

    def update_daily_metrics(self, repo_id: int):
        """Recalculate daily metrics."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO daily_metrics
                (repo_id, date, commits, lines_added, lines_deleted,
                 active_contributors, files_changed)
                SELECT
                    repo_id,
                    DATE(commit_date) as date,
                    COUNT(*) as commits,
                    SUM(lines_added) as lines_added,
                    SUM(lines_deleted) as lines_deleted,
                    COUNT(DISTINCT author_email) as active_contributors,
                    SUM(files_changed) as files_changed
                FROM commits
                WHERE repo_id = ?
                GROUP BY DATE(commit_date)
            """, (repo_id,))

    def get_contributor_stats(self, repo_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """Get top contributors with their stats."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM contributors
                WHERE repo_id = ?
                ORDER BY total_commits DESC
                LIMIT ?
            """, (repo_id, limit))
            return [dict(row) for row in cursor.fetchall()]

    def get_file_hotspots(self, repo_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """Get most frequently changed files."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM file_hotspots
                WHERE repo_id = ?
                ORDER BY change_count DESC
                LIMIT ?
            """, (repo_id, limit))
            return [dict(row) for row in cursor.fetchall()]

    def get_daily_metrics(self, repo_id: int, days: int = 30) -> List[Dict[str, Any]]:
        """Get daily metrics for the last N days."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM daily_metrics
                WHERE repo_id = ?
                ORDER BY date DESC
                LIMIT ?
            """, (repo_id, days))
            return [dict(row) for row in cursor.fetchall()]

    def get_repository_summary(self, repo_id: int) -> Dict[str, Any]:
        """Get overall repository statistics."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    COUNT(*) as total_commits,
                    COUNT(DISTINCT author_email) as total_contributors,
                    SUM(lines_added) as total_lines_added,
                    SUM(lines_deleted) as total_lines_deleted,
                    SUM(lines_changed) as total_lines_changed,
                    MIN(commit_date) as first_commit,
                    MAX(commit_date) as last_commit
                FROM commits
                WHERE repo_id = ?
            """, (repo_id,))
            row = cursor.fetchone()
            return dict(row) if row else {}

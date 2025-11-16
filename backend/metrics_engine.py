"""
Metrics calculation engine for advanced git analytics.
"""
from typing import Dict, Any, List
from datetime import datetime, timedelta
from collections import defaultdict
import math


class MetricsEngine:
    """Advanced metrics calculation for git repositories."""

    def __init__(self, db):
        self.db = db

    def calculate_code_churn(self, repo_id: int, days: int = 30) -> Dict[str, Any]:
        """
        Calculate code churn metrics.
        Churn = lines added + lines deleted in a time period.
        High churn can indicate unstable code or areas of active development.
        """
        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # Get churn by file
            cursor.execute("""
                SELECT
                    fc.file_path,
                    SUM(fc.lines_added + fc.lines_deleted) as churn,
                    COUNT(DISTINCT c.id) as change_frequency,
                    COUNT(DISTINCT c.author_email) as contributors
                FROM file_changes fc
                JOIN commits c ON fc.commit_id = c.id
                WHERE c.repo_id = ?
                AND c.commit_date >= datetime('now', '-' || ? || ' days')
                GROUP BY fc.file_path
                ORDER BY churn DESC
                LIMIT 50
            """, (repo_id, days))

            file_churn = [dict(row) for row in cursor.fetchall()]

            # Get churn by developer
            cursor.execute("""
                SELECT
                    author_name,
                    author_email,
                    SUM(lines_added + lines_deleted) as churn,
                    SUM(lines_added) as added,
                    SUM(lines_deleted) as deleted,
                    COUNT(*) as commits
                FROM commits
                WHERE repo_id = ?
                AND commit_date >= datetime('now', '-' || ? || ' days')
                GROUP BY author_email
                ORDER BY churn DESC
            """, (repo_id, days))

            developer_churn = [dict(row) for row in cursor.fetchall()]

            # Calculate total churn
            total_churn = sum(d['churn'] for d in developer_churn)

            return {
                'total_churn': total_churn,
                'file_churn': file_churn,
                'developer_churn': developer_churn,
                'period_days': days
            }

    def calculate_velocity_trends(self, repo_id: int, weeks: int = 12) -> Dict[str, Any]:
        """
        Calculate development velocity trends over time.
        Tracks commits, lines changed, and active contributors per week.
        """
        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    strftime('%Y-%W', commit_date) as week,
                    COUNT(*) as commits,
                    SUM(lines_added) as lines_added,
                    SUM(lines_deleted) as lines_deleted,
                    SUM(lines_changed) as lines_changed,
                    COUNT(DISTINCT author_email) as active_contributors
                FROM commits
                WHERE repo_id = ?
                AND commit_date >= datetime('now', '-' || ? || ' days')
                GROUP BY week
                ORDER BY week ASC
            """, (repo_id, weeks * 7))

            weekly_data = [dict(row) for row in cursor.fetchall()]

            # Calculate trends
            if len(weekly_data) >= 2:
                recent_avg_commits = sum(w['commits'] for w in weekly_data[-4:]) / min(4, len(weekly_data[-4:]))
                older_avg_commits = sum(w['commits'] for w in weekly_data[:4]) / min(4, len(weekly_data[:4]))
                commit_trend = ((recent_avg_commits - older_avg_commits) / older_avg_commits * 100) if older_avg_commits > 0 else 0
            else:
                commit_trend = 0

            return {
                'weekly_metrics': weekly_data,
                'commit_trend_percentage': round(commit_trend, 2),
                'weeks_analyzed': len(weekly_data)
            }

    def calculate_bus_factor(self, repo_id: int) -> Dict[str, Any]:
        """
        Calculate bus factor (knowledge distribution).
        Bus factor is the minimum number of team members that would need to
        be lost before a project is at risk due to knowledge concentration.
        """
        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # Get file ownership distribution
            cursor.execute("""
                SELECT
                    fc.file_path,
                    c.author_email,
                    COUNT(*) as changes
                FROM file_changes fc
                JOIN commits c ON fc.commit_id = c.id
                WHERE c.repo_id = ?
                GROUP BY fc.file_path, c.author_email
            """, (repo_id,))

            file_ownership = defaultdict(lambda: defaultdict(int))
            for row in cursor.fetchall():
                file_ownership[row['file_path']][row['author_email']] = row['changes']

            # Calculate files with single owner (>80% of changes)
            files_with_single_owner = 0
            file_risk_details = []

            for file_path, authors in file_ownership.items():
                total_changes = sum(authors.values())
                primary_author = max(authors.items(), key=lambda x: x[1])
                ownership_percentage = (primary_author[1] / total_changes) * 100

                if ownership_percentage >= 80:
                    files_with_single_owner += 1
                    file_risk_details.append({
                        'file_path': file_path,
                        'primary_owner': primary_author[0],
                        'ownership_percentage': round(ownership_percentage, 2),
                        'total_changes': total_changes
                    })

            # Calculate contributor concentration
            cursor.execute("""
                SELECT
                    author_email,
                    total_commits,
                    total_lines_changed
                FROM contributors
                WHERE repo_id = ?
                ORDER BY total_commits DESC
            """, (repo_id,))

            contributors = [dict(row) for row in cursor.fetchall()]
            total_commits = sum(c['total_commits'] for c in contributors)

            # Find minimum contributors for 50% of commits (simplified bus factor)
            cumulative_commits = 0
            bus_factor = 0
            for contributor in contributors:
                cumulative_commits += contributor['total_commits']
                bus_factor += 1
                if cumulative_commits >= total_commits * 0.5:
                    break

            return {
                'bus_factor': bus_factor,
                'total_files': len(file_ownership),
                'files_with_single_owner': files_with_single_owner,
                'single_owner_percentage': round((files_with_single_owner / len(file_ownership) * 100), 2) if file_ownership else 0,
                'high_risk_files': sorted(file_risk_details, key=lambda x: x['ownership_percentage'], reverse=True)[:20],
                'contributor_distribution': contributors[:10]
            }

    def calculate_commit_patterns(self, repo_id: int) -> Dict[str, Any]:
        """
        Analyze commit patterns by time of day and day of week.
        Helps understand team working patterns.
        """
        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # Commits by hour of day
            cursor.execute("""
                SELECT
                    CAST(strftime('%H', commit_date) AS INTEGER) as hour,
                    COUNT(*) as commits
                FROM commits
                WHERE repo_id = ?
                GROUP BY hour
                ORDER BY hour
            """, (repo_id,))

            hourly_commits = {row['hour']: row['commits'] for row in cursor.fetchall()}
            hourly_data = [hourly_commits.get(h, 0) for h in range(24)]

            # Commits by day of week
            cursor.execute("""
                SELECT
                    CAST(strftime('%w', commit_date) AS INTEGER) as day_of_week,
                    COUNT(*) as commits
                FROM commits
                WHERE repo_id = ?
                GROUP BY day_of_week
                ORDER BY day_of_week
            """, (repo_id,))

            daily_commits = {row['day_of_week']: row['commits'] for row in cursor.fetchall()}
            # 0 = Sunday, 1 = Monday, etc.
            daily_data = [daily_commits.get(d, 0) for d in range(7)]

            return {
                'hourly_distribution': hourly_data,
                'daily_distribution': daily_data,
                'peak_hour': hourly_data.index(max(hourly_data)) if hourly_data else 0,
                'peak_day': daily_data.index(max(daily_data)) if daily_data else 0
            }

    def calculate_code_quality_indicators(self, repo_id: int) -> Dict[str, Any]:
        """
        Calculate code quality indicators based on commit patterns.
        """
        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # Average commit size
            cursor.execute("""
                SELECT
                    AVG(lines_changed) as avg_commit_size,
                    AVG(files_changed) as avg_files_per_commit
                FROM commits
                WHERE repo_id = ?
            """, (repo_id,))

            avg_stats = dict(cursor.fetchone())

            # Find potential "god files" (files that are too large or change too often)
            cursor.execute("""
                SELECT
                    file_path,
                    change_count,
                    unique_contributors,
                    total_lines_changed
                FROM file_hotspots
                WHERE repo_id = ?
                ORDER BY change_count DESC
                LIMIT 20
            """, (repo_id,))

            hotspots = [dict(row) for row in cursor.fetchall()]

            # Commit message quality (simple heuristic: length > 10 chars is "good")
            cursor.execute("""
                SELECT
                    COUNT(CASE WHEN LENGTH(message) < 10 THEN 1 END) as short_messages,
                    COUNT(*) as total_messages
                FROM commits
                WHERE repo_id = ?
            """, (repo_id,))

            message_stats = dict(cursor.fetchone())
            message_quality_score = ((message_stats['total_messages'] - message_stats['short_messages']) /
                                    message_stats['total_messages'] * 100) if message_stats['total_messages'] > 0 else 0

            return {
                'average_commit_size': round(avg_stats['avg_commit_size'], 2) if avg_stats['avg_commit_size'] else 0,
                'average_files_per_commit': round(avg_stats['avg_files_per_commit'], 2) if avg_stats['avg_files_per_commit'] else 0,
                'message_quality_score': round(message_quality_score, 2),
                'file_hotspots': hotspots
            }

    def calculate_contributor_insights(self, repo_id: int) -> Dict[str, Any]:
        """
        Calculate detailed contributor insights and collaboration patterns.
        """
        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # Get all contributors with their metrics
            cursor.execute("""
                SELECT
                    author_name,
                    author_email,
                    total_commits,
                    total_lines_added,
                    total_lines_deleted,
                    total_lines_changed,
                    first_commit_date,
                    last_commit_date,
                    JULIANDAY(last_commit_date) - JULIANDAY(first_commit_date) as days_active
                FROM contributors
                WHERE repo_id = ?
                ORDER BY total_commits DESC
            """, (repo_id,))

            contributors = [dict(row) for row in cursor.fetchall()]

            # Calculate contribution percentages
            total_commits = sum(c['total_commits'] for c in contributors)
            total_lines = sum(c['total_lines_changed'] for c in contributors)

            for contributor in contributors:
                contributor['commit_percentage'] = round((contributor['total_commits'] / total_commits * 100), 2) if total_commits > 0 else 0
                contributor['lines_percentage'] = round((contributor['total_lines_changed'] / total_lines * 100), 2) if total_lines > 0 else 0
                contributor['avg_commit_size'] = round((contributor['total_lines_changed'] / contributor['total_commits']), 2) if contributor['total_commits'] > 0 else 0

            # Identify roles based on patterns
            for contributor in contributors:
                if contributor['commit_percentage'] > 30:
                    contributor['role'] = 'Core Contributor'
                elif contributor['commit_percentage'] > 10:
                    contributor['role'] = 'Regular Contributor'
                else:
                    contributor['role'] = 'Occasional Contributor'

            return {
                'total_contributors': len(contributors),
                'active_contributors_last_30_days': self._count_active_contributors(repo_id, 30),
                'contributors': contributors,
                'top_contributors': contributors[:10]
            }

    def _count_active_contributors(self, repo_id: int, days: int) -> int:
        """Count contributors active in the last N days."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(DISTINCT author_email)
                FROM commits
                WHERE repo_id = ?
                AND commit_date >= datetime('now', '-' || ? || ' days')
            """, (repo_id, days))
            return cursor.fetchone()[0]

    def get_comprehensive_metrics(self, repo_id: int) -> Dict[str, Any]:
        """Get all metrics in one comprehensive report."""
        return {
            'summary': self.db.get_repository_summary(repo_id),
            'churn': self.calculate_code_churn(repo_id, days=30),
            'velocity': self.calculate_velocity_trends(repo_id, weeks=12),
            'bus_factor': self.calculate_bus_factor(repo_id),
            'commit_patterns': self.calculate_commit_patterns(repo_id),
            'quality_indicators': self.calculate_code_quality_indicators(repo_id),
            'contributors': self.calculate_contributor_insights(repo_id)
        }

    # Cross-repository metrics

    def get_all_repositories_summary(self) -> Dict[str, Any]:
        """Get summary metrics across all repositories."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # Overall statistics
            cursor.execute("""
                SELECT
                    COUNT(DISTINCT r.id) as total_repositories,
                    COUNT(DISTINCT c.id) as total_commits,
                    COUNT(DISTINCT c.author_email) as total_contributors,
                    SUM(c.lines_added) as total_lines_added,
                    SUM(c.lines_deleted) as total_lines_deleted,
                    SUM(c.lines_changed) as total_lines_changed,
                    MIN(c.commit_date) as first_commit,
                    MAX(c.commit_date) as last_commit
                FROM repositories r
                LEFT JOIN commits c ON r.id = c.repo_id
                WHERE r.is_active = 1
            """)

            overall = dict(cursor.fetchone())

            # Per-repository breakdown
            cursor.execute("""
                SELECT
                    r.id,
                    r.name,
                    r.provider,
                    r.last_sync,
                    COUNT(c.id) as commits,
                    COUNT(DISTINCT c.author_email) as contributors,
                    SUM(c.lines_added) as lines_added,
                    SUM(c.lines_deleted) as lines_deleted,
                    SUM(c.lines_changed) as lines_changed,
                    MIN(c.commit_date) as first_commit,
                    MAX(c.commit_date) as last_commit
                FROM repositories r
                LEFT JOIN commits c ON r.id = c.repo_id
                WHERE r.is_active = 1
                GROUP BY r.id
                ORDER BY commits DESC
            """)

            repositories = [dict(row) for row in cursor.fetchall()]

            return {
                'overall': overall,
                'repositories': repositories
            }

    def get_repository_comparison(self, metric_type: str = 'commits') -> List[Dict[str, Any]]:
        """Compare repositories by specific metric."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            if metric_type == 'commits':
                cursor.execute("""
                    SELECT
                        r.id,
                        r.name,
                        COUNT(c.id) as value
                    FROM repositories r
                    LEFT JOIN commits c ON r.id = c.repo_id
                    WHERE r.is_active = 1
                    GROUP BY r.id
                    ORDER BY value DESC
                """)
            elif metric_type == 'contributors':
                cursor.execute("""
                    SELECT
                        r.id,
                        r.name,
                        COUNT(DISTINCT c.author_email) as value
                    FROM repositories r
                    LEFT JOIN commits c ON r.id = c.repo_id
                    WHERE r.is_active = 1
                    GROUP BY r.id
                    ORDER BY value DESC
                """)
            elif metric_type == 'churn':
                cursor.execute("""
                    SELECT
                        r.id,
                        r.name,
                        SUM(c.lines_changed) as value
                    FROM repositories r
                    LEFT JOIN commits c ON r.id = c.repo_id
                    WHERE r.is_active = 1
                    GROUP BY r.id
                    ORDER BY value DESC
                """)
            else:
                return []

            return [dict(row) for row in cursor.fetchall()]

    def get_cross_repository_contributors(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get contributors across all repositories."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # Aggregate contributors across all repos
            cursor.execute("""
                SELECT
                    c.author_name,
                    c.author_email,
                    COUNT(DISTINCT c.repo_id) as repositories_count,
                    SUM(c.total_commits) as total_commits,
                    SUM(c.total_lines_added) as total_lines_added,
                    SUM(c.total_lines_deleted) as total_lines_deleted,
                    SUM(c.total_lines_changed) as total_lines_changed,
                    MIN(c.first_commit_date) as first_commit_date,
                    MAX(c.last_commit_date) as last_commit_date
                FROM contributors c
                JOIN repositories r ON c.repo_id = r.id
                WHERE r.is_active = 1
                GROUP BY c.author_email
                ORDER BY total_commits DESC
                LIMIT ?
            """, (limit,))

            contributors = [dict(row) for row in cursor.fetchall()]

            # Get repository breakdown for each contributor
            for contributor in contributors:
                cursor.execute("""
                    SELECT
                        r.name as repo_name,
                        c.total_commits,
                        c.total_lines_changed
                    FROM contributors c
                    JOIN repositories r ON c.repo_id = r.id
                    WHERE c.author_email = ?
                    AND r.is_active = 1
                    ORDER BY c.total_commits DESC
                """, (contributor['author_email'],))

                contributor['repositories'] = [dict(row) for row in cursor.fetchall()]

            return contributors

    def get_cross_repository_churn(self, days: int = 30) -> Dict[str, Any]:
        """Get code churn metrics across all repositories."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # Total churn across all repos
            cursor.execute("""
                SELECT
                    SUM(lines_added + lines_deleted) as total_churn
                FROM commits c
                JOIN repositories r ON c.repo_id = r.id
                WHERE r.is_active = 1
                AND c.commit_date >= datetime('now', '-' || ? || ' days')
            """, (days,))

            total_churn = cursor.fetchone()[0] or 0

            # Churn by repository
            cursor.execute("""
                SELECT
                    r.id,
                    r.name,
                    SUM(c.lines_added + c.lines_deleted) as churn,
                    COUNT(c.id) as commits
                FROM repositories r
                LEFT JOIN commits c ON r.id = c.repo_id
                WHERE r.is_active = 1
                AND c.commit_date >= datetime('now', '-' || ? || ' days')
                GROUP BY r.id
                ORDER BY churn DESC
            """, (days,))

            repo_churn = [dict(row) for row in cursor.fetchall()]

            # Churn by contributor across all repos
            cursor.execute("""
                SELECT
                    c.author_name,
                    c.author_email,
                    SUM(c.lines_added + c.lines_deleted) as churn,
                    COUNT(DISTINCT c.repo_id) as repositories,
                    COUNT(c.id) as commits
                FROM commits c
                JOIN repositories r ON c.repo_id = r.id
                WHERE r.is_active = 1
                AND c.commit_date >= datetime('now', '-' || ? || ' days')
                GROUP BY c.author_email
                ORDER BY churn DESC
                LIMIT 30
            """, (days,))

            contributor_churn = [dict(row) for row in cursor.fetchall()]

            return {
                'total_churn': total_churn,
                'period_days': days,
                'repository_churn': repo_churn,
                'contributor_churn': contributor_churn
            }

    def get_contributor_by_email(self, email: str) -> Dict[str, Any]:
        """Get detailed metrics for a specific contributor across all repositories."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # Overall stats
            cursor.execute("""
                SELECT
                    c.author_name,
                    c.author_email,
                    COUNT(DISTINCT c.repo_id) as repositories_count,
                    SUM(c.total_commits) as total_commits,
                    SUM(c.total_lines_added) as total_lines_added,
                    SUM(c.total_lines_deleted) as total_lines_deleted,
                    SUM(c.total_lines_changed) as total_lines_changed,
                    MIN(c.first_commit_date) as first_commit_date,
                    MAX(c.last_commit_date) as last_commit_date
                FROM contributors c
                JOIN repositories r ON c.repo_id = r.id
                WHERE c.author_email = ?
                AND r.is_active = 1
                GROUP BY c.author_email
            """, (email,))

            row = cursor.fetchone()
            if not row:
                return None

            stats = dict(row)

            # Repository breakdown
            cursor.execute("""
                SELECT
                    r.id,
                    r.name,
                    c.total_commits,
                    c.total_lines_added,
                    c.total_lines_deleted,
                    c.total_lines_changed,
                    c.first_commit_date,
                    c.last_commit_date
                FROM contributors c
                JOIN repositories r ON c.repo_id = r.id
                WHERE c.author_email = ?
                AND r.is_active = 1
                ORDER BY c.total_commits DESC
            """, (email,))

            stats['repositories'] = [dict(row) for row in cursor.fetchall()]

            # Recent activity (last 30 days)
            cursor.execute("""
                SELECT
                    DATE(commit_date) as date,
                    COUNT(*) as commits,
                    SUM(lines_changed) as lines_changed
                FROM commits
                WHERE author_email = ?
                AND commit_date >= datetime('now', '-30 days')
                GROUP BY DATE(commit_date)
                ORDER BY date ASC
            """, (email,))

            stats['recent_activity'] = [dict(row) for row in cursor.fetchall()]

            return stats

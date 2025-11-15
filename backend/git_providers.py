"""
Git provider integrations for GitHub and Bitbucket.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
import requests
from urllib.parse import urlparse


class GitProvider(ABC):
    """Abstract base class for git providers."""

    @abstractmethod
    def fetch_commits(self, repo_url: str, access_token: Optional[str] = None,
                     since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Fetch commits from the repository."""
        pass

    @abstractmethod
    def validate_access(self, repo_url: str, access_token: Optional[str] = None) -> bool:
        """Validate access to the repository."""
        pass


class GitHubProvider(GitProvider):
    """GitHub API integration."""

    API_BASE = "https://api.github.com"

    def __init__(self):
        self.session = requests.Session()

    def _parse_repo_url(self, repo_url: str) -> tuple[str, str]:
        """Extract owner and repo name from GitHub URL."""
        # Handle various GitHub URL formats
        # https://github.com/owner/repo
        # https://github.com/owner/repo.git
        # git@github.com:owner/repo.git

        if repo_url.startswith("git@"):
            # SSH format
            parts = repo_url.replace("git@github.com:", "").replace(".git", "").split("/")
        else:
            # HTTP/HTTPS format
            parsed = urlparse(repo_url)
            parts = parsed.path.strip("/").replace(".git", "").split("/")

        if len(parts) >= 2:
            return parts[0], parts[1]
        raise ValueError(f"Invalid GitHub repository URL: {repo_url}")

    def _get_headers(self, access_token: Optional[str] = None) -> Dict[str, str]:
        """Get request headers with authentication."""
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitMetrics/1.0"
        }
        if access_token:
            headers["Authorization"] = f"token {access_token}"
        return headers

    def validate_access(self, repo_url: str, access_token: Optional[str] = None) -> bool:
        """Validate access to the repository."""
        try:
            owner, repo = self._parse_repo_url(repo_url)
            url = f"{self.API_BASE}/repos/{owner}/{repo}"
            response = self.session.get(url, headers=self._get_headers(access_token))
            return response.status_code == 200
        except Exception:
            return False

    def fetch_commits(self, repo_url: str, access_token: Optional[str] = None,
                     since: Optional[datetime] = None, limit: int = 1000) -> List[Dict[str, Any]]:
        """Fetch commits from GitHub repository."""
        owner, repo = self._parse_repo_url(repo_url)
        commits = []

        url = f"{self.API_BASE}/repos/{owner}/{repo}/commits"
        params = {"per_page": 100}

        if since:
            params["since"] = since.isoformat()

        headers = self._get_headers(access_token)

        # Paginate through commits
        page = 1
        while len(commits) < limit:
            params["page"] = page
            response = self.session.get(url, headers=headers, params=params)

            if response.status_code != 200:
                print(f"Error fetching commits: {response.status_code}")
                break

            page_commits = response.json()
            if not page_commits:
                break

            # Fetch detailed stats for each commit
            for commit_data in page_commits:
                try:
                    commit_detail = self._fetch_commit_details(
                        owner, repo, commit_data['sha'], headers
                    )
                    commits.append(commit_detail)

                    if len(commits) >= limit:
                        break
                except Exception as e:
                    print(f"Error fetching commit {commit_data['sha']}: {e}")
                    continue

            page += 1

            # Check if there are more pages
            if 'Link' not in response.headers or 'next' not in response.headers['Link']:
                break

        return commits

    def _fetch_commit_details(self, owner: str, repo: str, sha: str,
                             headers: Dict[str, str]) -> Dict[str, Any]:
        """Fetch detailed commit information including file changes."""
        url = f"{self.API_BASE}/repos/{owner}/{repo}/commits/{sha}"
        response = self.session.get(url, headers=headers)
        response.raise_for_status()

        data = response.json()

        # Extract commit information
        commit_info = {
            'sha': sha,
            'author_name': data['commit']['author']['name'],
            'author_email': data['commit']['author']['email'],
            'committer_name': data['commit']['committer']['name'],
            'committer_email': data['commit']['committer']['email'],
            'message': data['commit']['message'],
            'commit_date': datetime.fromisoformat(
                data['commit']['author']['date'].replace('Z', '+00:00')
            ),
            'lines_added': data['stats']['additions'],
            'lines_deleted': data['stats']['deletions'],
            'lines_changed': data['stats']['total'],
            'files_changed': len(data.get('files', [])),
            'files': []
        }

        # Extract file changes
        for file_data in data.get('files', []):
            commit_info['files'].append({
                'file_path': file_data['filename'],
                'lines_added': file_data.get('additions', 0),
                'lines_deleted': file_data.get('deletions', 0),
                'status': file_data['status']
            })

        return commit_info

    def get_repository_info(self, repo_url: str, access_token: Optional[str] = None) -> Dict[str, Any]:
        """Get repository metadata."""
        owner, repo = self._parse_repo_url(repo_url)
        url = f"{self.API_BASE}/repos/{owner}/{repo}"
        response = self.session.get(url, headers=self._get_headers(access_token))
        response.raise_for_status()

        data = response.json()
        return {
            'name': data['name'],
            'full_name': data['full_name'],
            'description': data.get('description', ''),
            'created_at': data['created_at'],
            'updated_at': data['updated_at'],
            'language': data.get('language', ''),
            'stars': data['stargazers_count'],
            'forks': data['forks_count']
        }


class BitbucketProvider(GitProvider):
    """Bitbucket API integration."""

    API_BASE = "https://api.bitbucket.org/2.0"

    def __init__(self):
        self.session = requests.Session()

    def _parse_repo_url(self, repo_url: str) -> tuple[str, str]:
        """Extract workspace and repo name from Bitbucket URL."""
        # Handle various Bitbucket URL formats
        # https://bitbucket.org/workspace/repo
        # git@bitbucket.org:workspace/repo.git

        if repo_url.startswith("git@"):
            # SSH format
            parts = repo_url.replace("git@bitbucket.org:", "").replace(".git", "").split("/")
        else:
            # HTTP/HTTPS format
            parsed = urlparse(repo_url)
            parts = parsed.path.strip("/").replace(".git", "").split("/")

        if len(parts) >= 2:
            return parts[0], parts[1]
        raise ValueError(f"Invalid Bitbucket repository URL: {repo_url}")

    def _get_headers(self, access_token: Optional[str] = None) -> Dict[str, str]:
        """Get request headers with authentication."""
        headers = {
            "Accept": "application/json",
            "User-Agent": "GitMetrics/1.0"
        }
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        return headers

    def validate_access(self, repo_url: str, access_token: Optional[str] = None) -> bool:
        """Validate access to the repository."""
        try:
            workspace, repo = self._parse_repo_url(repo_url)
            url = f"{self.API_BASE}/repositories/{workspace}/{repo}"
            response = self.session.get(url, headers=self._get_headers(access_token))
            return response.status_code == 200
        except Exception:
            return False

    def fetch_commits(self, repo_url: str, access_token: Optional[str] = None,
                     since: Optional[datetime] = None, limit: int = 1000) -> List[Dict[str, Any]]:
        """Fetch commits from Bitbucket repository."""
        workspace, repo = self._parse_repo_url(repo_url)
        commits = []

        url = f"{self.API_BASE}/repositories/{workspace}/{repo}/commits"
        headers = self._get_headers(access_token)

        # Bitbucket uses cursor-based pagination
        next_url = url

        while next_url and len(commits) < limit:
            response = self.session.get(next_url, headers=headers)

            if response.status_code != 200:
                print(f"Error fetching commits: {response.status_code}")
                break

            data = response.json()

            for commit_data in data.get('values', []):
                try:
                    commit_detail = self._parse_commit(commit_data, workspace, repo, headers, since)
                    if commit_detail:
                        commits.append(commit_detail)

                    if len(commits) >= limit:
                        break
                except Exception as e:
                    print(f"Error parsing commit: {e}")
                    continue

            # Get next page URL
            next_url = data.get('next')

        return commits

    def _parse_commit(self, commit_data: Dict[str, Any], workspace: str, repo: str,
                     headers: Dict[str, str], since: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
        """Parse commit data from Bitbucket API."""
        commit_date = datetime.fromisoformat(
            commit_data['date'].replace('Z', '+00:00')
        )

        # Skip if before 'since' date
        if since and commit_date < since:
            return None

        sha = commit_data['hash']

        # Fetch diff stats for the commit
        stats = self._fetch_commit_stats(workspace, repo, sha, headers)

        return {
            'sha': sha,
            'author_name': commit_data['author']['user'].get('display_name', commit_data['author']['raw']) if 'user' in commit_data['author'] else commit_data['author']['raw'],
            'author_email': commit_data['author'].get('user', {}).get('email', ''),
            'committer_name': commit_data['author']['user'].get('display_name', '') if 'user' in commit_data['author'] else '',
            'committer_email': commit_data['author'].get('user', {}).get('email', ''),
            'message': commit_data['message'],
            'commit_date': commit_date,
            'lines_added': stats['lines_added'],
            'lines_deleted': stats['lines_deleted'],
            'lines_changed': stats['lines_changed'],
            'files_changed': stats['files_changed'],
            'files': stats['files']
        }

    def _fetch_commit_stats(self, workspace: str, repo: str, sha: str,
                           headers: Dict[str, str]) -> Dict[str, Any]:
        """Fetch commit statistics from diffstat."""
        url = f"{self.API_BASE}/repositories/{workspace}/{repo}/diffstat/{sha}"

        try:
            response = self.session.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()

            lines_added = 0
            lines_deleted = 0
            files = []

            for file_stat in data.get('values', []):
                added = file_stat.get('lines_added', 0)
                deleted = file_stat.get('lines_removed', 0)

                lines_added += added
                lines_deleted += deleted

                files.append({
                    'file_path': file_stat.get('new', {}).get('path', file_stat.get('old', {}).get('path', 'unknown')),
                    'lines_added': added,
                    'lines_deleted': deleted,
                    'status': file_stat.get('status', 'modified')
                })

            return {
                'lines_added': lines_added,
                'lines_deleted': lines_deleted,
                'lines_changed': lines_added + lines_deleted,
                'files_changed': len(files),
                'files': files
            }
        except Exception as e:
            print(f"Error fetching commit stats: {e}")
            return {
                'lines_added': 0,
                'lines_deleted': 0,
                'lines_changed': 0,
                'files_changed': 0,
                'files': []
            }

    def get_repository_info(self, repo_url: str, access_token: Optional[str] = None) -> Dict[str, Any]:
        """Get repository metadata."""
        workspace, repo = self._parse_repo_url(repo_url)
        url = f"{self.API_BASE}/repositories/{workspace}/{repo}"
        response = self.session.get(url, headers=self._get_headers(access_token))
        response.raise_for_status()

        data = response.json()
        return {
            'name': data['name'],
            'full_name': data['full_name'],
            'description': data.get('description', ''),
            'created_at': data['created_on'],
            'updated_at': data['updated_on'],
            'language': data.get('language', ''),
        }


def get_provider(provider_name: str) -> GitProvider:
    """Factory function to get the appropriate git provider."""
    providers = {
        'github': GitHubProvider,
        'bitbucket': BitbucketProvider
    }

    provider_class = providers.get(provider_name.lower())
    if not provider_class:
        raise ValueError(f"Unsupported provider: {provider_name}")

    return provider_class()

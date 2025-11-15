import { useState, useEffect } from 'react';
import { repositoryApi, syncApi } from '../api';
import type { Repository } from '../types';

interface HomeProps {
  onRepoAdded: () => void;
}

function Home({ onRepoAdded }: HomeProps) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    provider: 'github',
    access_token: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ [key: number]: any }>({});

  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    try {
      const response = await repositoryApi.list();
      setRepositories(response.data);
    } catch (err) {
      console.error('Failed to load repositories:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await repositoryApi.create(formData);
      setFormData({ name: '', url: '', provider: 'github', access_token: '' });
      setShowAddForm(false);
      onRepoAdded();
      loadRepositories();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add repository');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (repoId: number) => {
    try {
      await syncApi.start(repoId, false);
      pollSyncStatus(repoId);
    } catch (err) {
      console.error('Failed to start sync:', err);
    }
  };

  const pollSyncStatus = async (repoId: number) => {
    const interval = setInterval(async () => {
      try {
        const response = await syncApi.getStatus(repoId);
        setSyncStatus((prev) => ({ ...prev, [repoId]: response.data }));

        if (response.data.status === 'completed' || response.data.status === 'error') {
          clearInterval(interval);
          if (response.data.status === 'completed') {
            loadRepositories();
          }
        }
      } catch (err) {
        clearInterval(interval);
      }
    }, 2000);
  };

  const handleDelete = async (repoId: number) => {
    if (!window.confirm('Are you sure you want to remove this repository?')) {
      return;
    }

    try {
      await repositoryApi.delete(repoId);
      loadRepositories();
    } catch (err) {
      console.error('Failed to delete repository:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Git Metrics Dashboard</h2>
          <p className="text-gray-400 mt-2">
            Analyze your git repositories with comprehensive performance metrics
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition"
        >
          {showAddForm ? 'Cancel' : 'Add Repository'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold mb-4">Add New Repository</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Repository Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="my-repo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Repository URL</label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://github.com/username/repo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Provider</label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="github">GitHub</option>
                <option value="bitbucket">Bitbucket</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Access Token (optional for public repos)
              </label>
              <input
                type="password"
                value={formData.access_token}
                onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ghp_xxxxxxxxxxxx"
              />
              <p className="text-xs text-gray-400 mt-1">
                Required for private repositories or to avoid rate limits
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-md font-medium transition"
            >
              {loading ? 'Adding...' : 'Add Repository'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repositories.map((repo) => {
          const status = syncStatus[repo.id];
          return (
            <div
              key={repo.id}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{repo.name}</h3>
                  <p className="text-sm text-gray-400 mt-1 capitalize">{repo.provider}</p>
                </div>
                <button
                  onClick={() => handleDelete(repo.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-400">
                  Last sync:{' '}
                  {repo.last_sync
                    ? new Date(repo.last_sync).toLocaleString()
                    : 'Never'}
                </p>

                {status && status.status === 'running' && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{status.message}</span>
                      <span>{status.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${status.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {status && status.status === 'completed' && (
                  <p className="text-sm text-green-400">{status.message}</p>
                )}

                {status && status.status === 'error' && (
                  <p className="text-sm text-red-400">{status.message}</p>
                )}
              </div>

              <button
                onClick={() => handleSync(repo.id)}
                disabled={status?.status === 'running'}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:opacity-50 rounded-md text-sm font-medium transition"
              >
                {status?.status === 'running' ? 'Syncing...' : 'Sync Repository'}
              </button>
            </div>
          );
        })}
      </div>

      {repositories.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No repositories configured yet.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition"
          >
            Add Your First Repository
          </button>
        </div>
      )}
    </div>
  );
}

export default Home;

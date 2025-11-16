import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Contributors from './pages/Contributors';
import CodeChurn from './pages/CodeChurn';
import { repositoryApi } from './api';
import type { Repository } from './types';

function App() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    try {
      const response = await repositoryApi.list();
      setRepositories(response.data);
      if (response.data.length > 0 && !selectedRepo) {
        setSelectedRepo(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load repositories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRepoAdded = () => {
    loadRepositories();
  };

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="min-h-screen bg-gray-900 text-white">
        <nav className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-blue-400">Git Metrics</h1>
                <div className="ml-10 flex items-baseline space-x-4">
                  <Link
                    to="/"
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition"
                  >
                    Home
                  </Link>
                  {selectedRepo && (
                    <>
                      <Link
                        to={`/dashboard/${selectedRepo}`}
                        className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition"
                      >
                        Dashboard
                      </Link>
                      <Link
                        to={`/contributors/${selectedRepo}`}
                        className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition"
                      >
                        Contributors
                      </Link>
                      <Link
                        to={`/churn/${selectedRepo}`}
                        className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition"
                      >
                        Code Churn
                      </Link>
                    </>
                  )}
                </div>
              </div>
              {repositories.length > 0 && (
                <select
                  value={selectedRepo || ''}
                  onChange={(e) => setSelectedRepo(Number(e.target.value))}
                  className="bg-gray-700 text-white px-3 py-2 rounded-md text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Home onRepoAdded={handleRepoAdded} />} />
            <Route path="/dashboard/:repoId" element={<Dashboard />} />
            <Route path="/contributors/:repoId" element={<Contributors />} />
            <Route path="/churn/:repoId" element={<CodeChurn />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

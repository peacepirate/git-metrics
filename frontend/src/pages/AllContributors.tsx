import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Link } from 'react-router-dom';
import { crossRepoMetricsApi } from '../api';
import type { CrossRepositoryContributor } from '../types';

function AllContributors() {
  const [contributors, setContributors] = useState<CrossRepositoryContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContributors();
  }, []);

  const loadContributors = async () => {
    try {
      setLoading(true);
      const response = await crossRepoMetricsApi.getAllContributors(100);
      setContributors(response.data.contributors);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load cross-repository contributors');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">Loading all contributors...</div>
      </div>
    );
  }

  if (error || contributors.length === 0) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-400 mb-2">No Data Available</h3>
        <p className="text-gray-300">{error || 'No contributors found'}</p>
      </div>
    );
  }

  // Top contributors by commits chart
  const topContributorsOption = {
    title: {
      text: 'Top 20 Contributors by Commits (All Repositories)',
      textStyle: { color: '#fff' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#fff' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
      splitLine: { lineStyle: { color: '#374151' } },
    },
    yAxis: {
      type: 'category',
      data: contributors.slice(0, 20).map((c) => c.author_name).reverse(),
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
    },
    series: [
      {
        name: 'Commits',
        type: 'bar',
        data: contributors.slice(0, 20).map((c) => c.total_commits).reverse(),
        itemStyle: {
          color: '#3b82f6',
        },
      },
    ],
  };

  // Lines changed pie chart (top 10)
  const linesChangedOption = {
    title: {
      text: 'Top 10 Contributors by Lines Changed',
      textStyle: { color: '#fff' },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#fff' },
    },
    series: [
      {
        name: 'Lines Changed',
        type: 'pie',
        radius: ['40%', '70%'],
        data: contributors.slice(0, 10).map((c) => ({
          value: c.total_lines_changed,
          name: c.author_name,
        })),
        label: {
          color: '#9ca3af',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  // Repository participation chart
  const repoParticipationOption = {
    title: {
      text: 'Contributors by Repository Count',
      textStyle: { color: '#fff' },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#fff' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: contributors.slice(0, 15).map((c) => c.author_name),
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af', rotate: 45 },
    },
    yAxis: {
      type: 'value',
      name: 'Repositories',
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
      splitLine: { lineStyle: { color: '#374151' } },
    },
    series: [
      {
        name: 'Repositories',
        type: 'bar',
        data: contributors.slice(0, 15).map((c) => c.repositories_count),
        itemStyle: {
          color: '#8b5cf6',
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">All Contributors</h2>
        <p className="text-gray-400 mt-2">
          Contributors across all repositories with detailed metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Contributors</h3>
          <p className="text-3xl font-bold text-blue-400">{contributors.length}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Multi-Repo Contributors</h3>
          <p className="text-3xl font-bold text-green-400">
            {contributors.filter((c) => c.repositories_count > 1).length}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Commits</h3>
          <p className="text-3xl font-bold text-purple-400">
            {contributors.reduce((sum, c) => sum + c.total_commits, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <ReactECharts option={topContributorsOption} style={{ height: '500px' }} theme="dark" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <ReactECharts option={linesChangedOption} style={{ height: '400px' }} theme="dark" />
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <ReactECharts option={repoParticipationOption} style={{ height: '400px' }} theme="dark" />
        </div>
      </div>

      {/* Contributors Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold">All Contributors Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contributor
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Repositories
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Commits
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Lines +
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Lines -
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Total Changed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Repositories
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {contributors.map((contributor) => (
                <tr key={contributor.author_email} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium">{contributor.author_name}</div>
                      <div className="text-xs text-gray-400">{contributor.author_email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-purple-900/50 text-purple-300">
                      {contributor.repositories_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {contributor.total_commits.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-green-400">
                    +{contributor.total_lines_added.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-red-400">
                    -{contributor.total_lines_deleted.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                    {contributor.total_lines_changed.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {contributor.repositories.slice(0, 3).map((repo, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300"
                          title={`${repo.total_commits} commits`}
                        >
                          {repo.repo_name}
                        </span>
                      ))}
                      {contributor.repositories.length > 3 && (
                        <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-400">
                          +{contributor.repositories.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AllContributors;

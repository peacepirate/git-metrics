import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { crossRepoMetricsApi } from '../api';
import type { AllRepositoriesSummary, RepositoryComparison, CrossRepositoryChurn } from '../types';

function AllRepositories() {
  const [summary, setSummary] = useState<AllRepositoriesSummary | null>(null);
  const [comparison, setComparison] = useState<RepositoryComparison | null>(null);
  const [churn, setChurn] = useState<CrossRepositoryChurn | null>(null);
  const [comparisonMetric, setComparisonMetric] = useState<'commits' | 'contributors' | 'churn'>('commits');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [comparisonMetric]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const [summaryResponse, comparisonResponse, churnResponse] = await Promise.all([
        crossRepoMetricsApi.getAllSummary(),
        crossRepoMetricsApi.getComparison(comparisonMetric),
        crossRepoMetricsApi.getAllChurn(30),
      ]);

      setSummary(summaryResponse.data);
      setComparison(comparisonResponse.data);
      setChurn(churnResponse.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load cross-repository metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">Loading all repositories metrics...</div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-400 mb-2">No Data Available</h3>
        <p className="text-gray-300">{error || 'No repositories synced yet'}</p>
        <p className="text-gray-400 mt-2">Please add and sync repositories from the Home page.</p>
      </div>
    );
  }

  // Repository comparison chart
  const comparisonOption = {
    title: {
      text: `Repository Comparison by ${comparisonMetric.charAt(0).toUpperCase() + comparisonMetric.slice(1)}`,
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
      data: comparison?.repositories.map(r => r.name).reverse() || [],
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
    },
    series: [
      {
        name: comparisonMetric,
        type: 'bar',
        data: comparison?.repositories.map(r => r.value).reverse() || [],
        itemStyle: {
          color: '#3b82f6',
        },
      },
    ],
  };

  // Repository churn chart
  const churnOption = {
    title: {
      text: 'Code Churn by Repository (Last 30 Days)',
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
      data: churn?.repository_churn.map(r => r.name).reverse() || [],
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
    },
    series: [
      {
        name: 'Churn',
        type: 'bar',
        data: churn?.repository_churn.map(r => r.churn).reverse() || [],
        itemStyle: {
          color: '#ef4444',
        },
      },
    ],
  };

  // Top contributors churn (across all repos)
  const topContributorsChurnOption = {
    title: {
      text: 'Top 15 Contributors by Churn (All Repositories)',
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
      data: churn?.contributor_churn.slice(0, 15).map(c => c.author_name).reverse() || [],
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
    },
    series: [
      {
        name: 'Churn',
        type: 'bar',
        data: churn?.contributor_churn.slice(0, 15).map(c => c.churn).reverse() || [],
        itemStyle: {
          color: '#f59e0b',
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">All Repositories Overview</h2>
        <p className="text-gray-400 mt-2">
          Combined metrics across all synchronized repositories
        </p>
      </div>

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Repositories</h3>
          <p className="text-3xl font-bold text-purple-400">
            {summary.overall.total_repositories || 0}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Commits</h3>
          <p className="text-3xl font-bold text-blue-400">
            {(summary.overall.total_commits || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Contributors</h3>
          <p className="text-3xl font-bold text-green-400">
            {summary.overall.total_contributors || 0}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Lines Changed</h3>
          <p className="text-3xl font-bold text-orange-400">
            {(summary.overall.total_lines_changed || 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            +{(summary.overall.total_lines_added || 0).toLocaleString()} /
            -{(summary.overall.total_lines_deleted || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Repository Comparison */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Repository Comparison</h3>
          <select
            value={comparisonMetric}
            onChange={(e) => setComparisonMetric(e.target.value as any)}
            className="bg-gray-700 text-white px-3 py-2 rounded-md text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="commits">Commits</option>
            <option value="contributors">Contributors</option>
            <option value="churn">Code Churn</option>
          </select>
        </div>
        <ReactECharts option={comparisonOption} style={{ height: '400px' }} theme="dark" />
      </div>

      {/* Churn Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <ReactECharts option={churnOption} style={{ height: '400px' }} theme="dark" />
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <ReactECharts option={topContributorsChurnOption} style={{ height: '400px' }} theme="dark" />
        </div>
      </div>

      {/* Repository Details Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold">Repository Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Repository
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Commits
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contributors
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Lines +
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Lines -
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Total Churn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Last Sync
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {summary.repositories.map((repo) => (
                <tr key={repo.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{repo.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize text-gray-400">
                    {repo.provider}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {repo.commits?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {repo.contributors || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-green-400">
                    +{repo.lines_added?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-red-400">
                    -{repo.lines_deleted?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                    {repo.lines_changed?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">
                    {repo.last_sync
                      ? new Date(repo.last_sync).toLocaleDateString()
                      : 'Never'}
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

export default AllRepositories;

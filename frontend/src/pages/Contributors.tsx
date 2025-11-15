import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { metricsApi } from '../api';
import type { ContributorInsights } from '../types';

function Contributors() {
  const { repoId } = useParams<{ repoId: string }>();
  const [insights, setInsights] = useState<ContributorInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (repoId) {
      loadInsights();
    }
  }, [repoId]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const response = await metricsApi.getContributorInsights(Number(repoId));
      setInsights(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load contributor insights');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">Loading contributor insights...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-400 mb-2">No Data Available</h3>
        <p className="text-gray-300">{error}</p>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  // Top contributors by commits chart
  const topContributorsOption = {
    title: {
      text: 'Top 15 Contributors by Commits',
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
      data: insights.top_contributors
        .slice(0, 15)
        .map((c) => c.author_name)
        .reverse(),
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
    },
    series: [
      {
        name: 'Commits',
        type: 'bar',
        data: insights.top_contributors
          .slice(0, 15)
          .map((c) => c.total_commits)
          .reverse(),
        itemStyle: {
          color: '#3b82f6',
        },
      },
    ],
  };

  // Lines changed by top contributors
  const linesChangedOption = {
    title: {
      text: 'Lines Changed by Top Contributors',
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
        data: insights.top_contributors.slice(0, 10).map((c) => ({
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

  // Contribution distribution
  const distributionOption = {
    title: {
      text: 'Contribution Distribution',
      textStyle: { color: '#fff' },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#fff' },
    },
    legend: {
      data: ['Commits %', 'Lines %'],
      textStyle: { color: '#9ca3af' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: insights.top_contributors.slice(0, 10).map((c) => c.author_name),
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af', rotate: 45 },
    },
    yAxis: {
      type: 'value',
      name: 'Percentage',
      max: 100,
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#374151' } },
    },
    series: [
      {
        name: 'Commits %',
        type: 'bar',
        data: insights.top_contributors.slice(0, 10).map((c) => c.commit_percentage),
        itemStyle: { color: '#8b5cf6' },
      },
      {
        name: 'Lines %',
        type: 'bar',
        data: insights.top_contributors.slice(0, 10).map((c) => c.lines_percentage),
        itemStyle: { color: '#10b981' },
      },
    ],
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Core Contributor':
        return 'bg-blue-900/50 text-blue-300 border-blue-700';
      case 'Regular Contributor':
        return 'bg-green-900/50 text-green-300 border-green-700';
      default:
        return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Contributors</h2>
        <p className="text-gray-400 mt-2">
          Detailed insights into repository contributors and their impact
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Contributors</h3>
          <p className="text-3xl font-bold text-blue-400">
            {insights.total_contributors}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Active (Last 30 Days)</h3>
          <p className="text-3xl font-bold text-green-400">
            {insights.active_contributors_last_30_days}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Core Contributors</h3>
          <p className="text-3xl font-bold text-purple-400">
            {insights.contributors.filter((c) => c.role === 'Core Contributor').length}
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
          <ReactECharts option={distributionOption} style={{ height: '400px' }} theme="dark" />
        </div>
      </div>

      {/* Contributors Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold">All Contributors</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contributor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Role
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
                  Avg Commit Size
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contribution %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {insights.contributors.map((contributor, index) => (
                <tr key={contributor.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium">{contributor.author_name}</div>
                      <div className="text-xs text-gray-400">{contributor.author_email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded border ${getRoleBadgeColor(
                        contributor.role || ''
                      )}`}
                    >
                      {contributor.role}
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
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {contributor.avg_commit_size?.toFixed(0) || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-blue-400 font-medium">
                      {contributor.commit_percentage?.toFixed(1)}%
                    </span>
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

export default Contributors;

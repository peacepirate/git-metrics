import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { metricsApi } from '../api';
import type { ComprehensiveMetrics } from '../types';

function Dashboard() {
  const { repoId } = useParams<{ repoId: string }>();
  const [metrics, setMetrics] = useState<ComprehensiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (repoId) {
      loadMetrics();
    }
  }, [repoId]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const response = await metricsApi.getComprehensive(Number(repoId));
      setMetrics(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-400 mb-2">No Data Available</h3>
        <p className="text-gray-300">{error}</p>
        <p className="text-gray-400 mt-2">Please sync the repository first from the Home page.</p>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  // Velocity trend chart
  const velocityOption = {
    title: {
      text: 'Development Velocity (Last 12 Weeks)',
      textStyle: { color: '#fff' },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#fff' },
    },
    legend: {
      data: ['Commits', 'Lines Changed', 'Active Contributors'],
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
      data: metrics.velocity.weekly_metrics.map((w) => w.week),
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Count',
        axisLine: { lineStyle: { color: '#374151' } },
        axisLabel: { color: '#9ca3af' },
        splitLine: { lineStyle: { color: '#374151' } },
      },
      {
        type: 'value',
        name: 'Lines Changed',
        axisLine: { lineStyle: { color: '#374151' } },
        axisLabel: { color: '#9ca3af' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Commits',
        type: 'line',
        data: metrics.velocity.weekly_metrics.map((w) => w.commits),
        smooth: true,
        itemStyle: { color: '#3b82f6' },
      },
      {
        name: 'Lines Changed',
        type: 'line',
        yAxisIndex: 1,
        data: metrics.velocity.weekly_metrics.map((w) => w.lines_changed),
        smooth: true,
        itemStyle: { color: '#10b981' },
      },
      {
        name: 'Active Contributors',
        type: 'bar',
        data: metrics.velocity.weekly_metrics.map((w) => w.active_contributors),
        itemStyle: { color: '#8b5cf6' },
      },
    ],
  };

  // Commit patterns - hourly
  const hourlyPatternOption = {
    title: {
      text: 'Commits by Hour of Day',
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
      data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af', interval: 2 },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
      splitLine: { lineStyle: { color: '#374151' } },
    },
    series: [
      {
        name: 'Commits',
        type: 'bar',
        data: metrics.commit_patterns.hourly_distribution,
        itemStyle: {
          color: '#f59e0b',
        },
      },
    ],
  };

  // Commit patterns - daily
  const dailyPatternOption = {
    title: {
      text: 'Commits by Day of Week',
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
      data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
      splitLine: { lineStyle: { color: '#374151' } },
    },
    series: [
      {
        name: 'Commits',
        type: 'bar',
        data: metrics.commit_patterns.daily_distribution,
        itemStyle: {
          color: '#06b6d4',
        },
      },
    ],
  };

  // Top file hotspots
  const hotspotsOption = {
    title: {
      text: 'Top 10 File Hotspots',
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
      data: metrics.quality_indicators.file_hotspots
        .slice(0, 10)
        .map((f) => f.file_path.split('/').pop() || f.file_path)
        .reverse(),
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
    },
    series: [
      {
        name: 'Change Count',
        type: 'bar',
        data: metrics.quality_indicators.file_hotspots
          .slice(0, 10)
          .map((f) => f.change_count)
          .reverse(),
        itemStyle: {
          color: '#ef4444',
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Repository Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Commits</h3>
          <p className="text-3xl font-bold text-blue-400">
            {metrics.summary.total_commits.toLocaleString()}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Contributors</h3>
          <p className="text-3xl font-bold text-green-400">
            {metrics.summary.total_contributors}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.contributors.active_contributors_last_30_days} active (30d)
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Lines Changed</h3>
          <p className="text-3xl font-bold text-purple-400">
            {metrics.summary.total_lines_changed.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            +{metrics.summary.total_lines_added.toLocaleString()} /
            -{metrics.summary.total_lines_deleted.toLocaleString()}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Bus Factor</h3>
          <p className="text-3xl font-bold text-orange-400">
            {metrics.bus_factor.bus_factor}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.bus_factor.single_owner_percentage.toFixed(1)}% single-owner files
          </p>
        </div>
      </div>

      {/* Velocity Trend */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <ReactECharts option={velocityOption} style={{ height: '400px' }} theme="dark" />
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-400">Trend:</span>
          <span
            className={
              metrics.velocity.commit_trend_percentage >= 0
                ? 'text-green-400'
                : 'text-red-400'
            }
          >
            {metrics.velocity.commit_trend_percentage >= 0 ? '↑' : '↓'}{' '}
            {Math.abs(metrics.velocity.commit_trend_percentage).toFixed(1)}% vs earlier
            weeks
          </span>
        </div>
      </div>

      {/* Commit Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <ReactECharts option={hourlyPatternOption} style={{ height: '300px' }} theme="dark" />
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <ReactECharts option={dailyPatternOption} style={{ height: '300px' }} theme="dark" />
        </div>
      </div>

      {/* File Hotspots */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <ReactECharts option={hotspotsOption} style={{ height: '400px' }} theme="dark" />
      </div>

      {/* Quality Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Avg Commit Size</h3>
          <p className="text-2xl font-bold">
            {metrics.quality_indicators.average_commit_size.toFixed(0)} lines
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Avg Files/Commit</h3>
          <p className="text-2xl font-bold">
            {metrics.quality_indicators.average_files_per_commit.toFixed(1)}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Message Quality</h3>
          <p className="text-2xl font-bold">
            {metrics.quality_indicators.message_quality_score.toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

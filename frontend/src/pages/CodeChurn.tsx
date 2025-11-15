import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { metricsApi } from '../api';
import type { ChurnMetrics, BusFactorMetrics } from '../types';

function CodeChurn() {
  const { repoId } = useParams<{ repoId: string }>();
  const [churn, setChurn] = useState<ChurnMetrics | null>(null);
  const [busFactor, setBusFactor] = useState<BusFactorMetrics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (repoId) {
      loadMetrics();
    }
  }, [repoId, days]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const [churnResponse, busFactorResponse] = await Promise.all([
        metricsApi.getChurn(Number(repoId), days),
        metricsApi.getBusFactor(Number(repoId)),
      ]);
      setChurn(churnResponse.data);
      setBusFactor(busFactorResponse.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load churn metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">Loading churn metrics...</div>
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

  if (!churn || !busFactor) {
    return null;
  }

  // File churn chart
  const fileChurnOption = {
    title: {
      text: 'Top 20 Files by Churn',
      textStyle: { color: '#fff' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const data = churn.file_churn[params[0].dataIndex];
        return `
          <strong>${data.file_path}</strong><br/>
          Churn: ${data.churn.toLocaleString()}<br/>
          Changes: ${data.change_frequency}<br/>
          Contributors: ${data.contributors}
        `;
      },
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
      data: churn.file_churn
        .slice(0, 20)
        .map((f) => f.file_path.split('/').pop() || f.file_path)
        .reverse(),
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
    },
    series: [
      {
        name: 'Churn',
        type: 'bar',
        data: churn.file_churn
          .slice(0, 20)
          .map((f) => f.churn)
          .reverse(),
        itemStyle: {
          color: '#ef4444',
        },
      },
    ],
  };

  // Developer churn chart
  const developerChurnOption = {
    title: {
      text: 'Developer Churn Distribution',
      textStyle: { color: '#fff' },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#fff' },
    },
    legend: {
      data: ['Lines Added', 'Lines Deleted', 'Total Churn'],
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
      data: churn.developer_churn.slice(0, 10).map((d) => d.author_name),
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af', rotate: 45 },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
      splitLine: { lineStyle: { color: '#374151' } },
    },
    series: [
      {
        name: 'Lines Added',
        type: 'bar',
        stack: 'churn',
        data: churn.developer_churn.slice(0, 10).map((d) => d.added),
        itemStyle: { color: '#10b981' },
      },
      {
        name: 'Lines Deleted',
        type: 'bar',
        stack: 'churn',
        data: churn.developer_churn.slice(0, 10).map((d) => d.deleted),
        itemStyle: { color: '#ef4444' },
      },
      {
        name: 'Total Churn',
        type: 'line',
        data: churn.developer_churn.slice(0, 10).map((d) => d.churn),
        itemStyle: { color: '#f59e0b' },
      },
    ],
  };

  // Bus factor - high risk files
  const riskFilesOption = {
    title: {
      text: 'High Risk Files (Single Owner)',
      textStyle: { color: '#fff' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const data = busFactor.high_risk_files[params[0].dataIndex];
        return `
          <strong>${data.file_path}</strong><br/>
          Owner: ${data.primary_owner}<br/>
          Ownership: ${data.ownership_percentage.toFixed(1)}%<br/>
          Changes: ${data.total_changes}
        `;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      max: 100,
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#374151' } },
    },
    yAxis: {
      type: 'category',
      data: busFactor.high_risk_files
        .slice(0, 15)
        .map((f) => f.file_path.split('/').pop() || f.file_path)
        .reverse(),
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' },
    },
    series: [
      {
        name: 'Ownership %',
        type: 'bar',
        data: busFactor.high_risk_files
          .slice(0, 15)
          .map((f) => f.ownership_percentage)
          .reverse(),
        itemStyle: {
          color: '#f59e0b',
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Code Churn Analysis</h2>
          <p className="text-gray-400 mt-2">
            Identify unstable code and knowledge distribution risks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Period:</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-gray-700 text-white px-3 py-2 rounded-md text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Churn</h3>
          <p className="text-3xl font-bold text-red-400">
            {churn.total_churn.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Lines (last {days} days)</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Bus Factor</h3>
          <p className="text-3xl font-bold text-orange-400">{busFactor.bus_factor}</p>
          <p className="text-xs text-gray-500 mt-1">Minimum critical contributors</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">High Risk Files</h3>
          <p className="text-3xl font-bold text-yellow-400">
            {busFactor.files_with_single_owner}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {busFactor.single_owner_percentage.toFixed(1)}% of all files
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Churning Files</h3>
          <p className="text-3xl font-bold text-purple-400">
            {churn.file_churn.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Files changed in period</p>
        </div>
      </div>

      {/* File Churn Chart */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <ReactECharts option={fileChurnOption} style={{ height: '500px' }} theme="dark" />
        <div className="mt-4 text-sm text-gray-400">
          <p>
            <strong>Code Churn</strong> measures the amount of change in a file over time. High
            churn can indicate:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
            <li>Areas of active development or experimentation</li>
            <li>Potentially unstable or frequently buggy code</li>
            <li>Code that might benefit from refactoring</li>
          </ul>
        </div>
      </div>

      {/* Developer Churn Chart */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <ReactECharts option={developerChurnOption} style={{ height: '400px' }} theme="dark" />
      </div>

      {/* High Risk Files Chart */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <ReactECharts option={riskFilesOption} style={{ height: '500px' }} theme="dark" />
        <div className="mt-4 text-sm text-gray-400">
          <p>
            <strong>Bus Factor</strong> measures knowledge distribution. Files with a single owner
            (80%+ of changes) are at risk if that person leaves.
          </p>
          <p className="mt-2">
            Current bus factor: <strong className="text-orange-400">{busFactor.bus_factor}</strong>{' '}
            - This is the minimum number of team members who would need to leave before the project
            is at risk.
          </p>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Churning Files */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold">Top Churning Files</h3>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300">File</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-300">Churn</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-300">
                    Changes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {churn.file_churn.slice(0, 30).map((file, index) => (
                  <tr key={index} className="hover:bg-gray-700/50">
                    <td className="px-4 py-2 truncate max-w-xs" title={file.file_path}>
                      {file.file_path}
                    </td>
                    <td className="px-4 py-2 text-right text-red-400">
                      {file.churn.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">{file.change_frequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* High Risk Files */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold">High Risk Files</h3>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300">File</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300">Owner</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-300">
                    Owner %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {busFactor.high_risk_files.slice(0, 30).map((file, index) => (
                  <tr key={index} className="hover:bg-gray-700/50">
                    <td className="px-4 py-2 truncate max-w-xs" title={file.file_path}>
                      {file.file_path}
                    </td>
                    <td className="px-4 py-2 truncate max-w-xs" title={file.primary_owner}>
                      {file.primary_owner}
                    </td>
                    <td className="px-4 py-2 text-right text-orange-400">
                      {file.ownership_percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CodeChurn;

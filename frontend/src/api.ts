import axios from 'axios';
import type {
  Repository,
  RepositorySummary,
  Contributor,
  FileHotspot,
  DailyMetric,
  ChurnMetrics,
  VelocityMetrics,
  BusFactorMetrics,
  CommitPatterns,
  QualityIndicators,
  ContributorInsights,
  ComprehensiveMetrics,
  SyncStatus,
  AllRepositoriesSummary,
  RepositoryComparison,
  CrossRepositoryContributor,
  CrossRepositoryChurn,
  ContributorDetails,
} from './types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Repository endpoints
export const repositoryApi = {
  list: () => api.get<Repository[]>('/repositories'),

  create: (data: {
    name: string;
    url: string;
    provider: string;
    access_token?: string;
  }) => api.post('/repositories', data),

  get: (id: number) => api.get<Repository>(`/repositories/${id}`),

  delete: (id: number) => api.delete(`/repositories/${id}`),
};

// Sync endpoints
export const syncApi = {
  start: (repoId: number, fullSync: boolean = false) =>
    api.post<{ message: string; repo_id: number }>('/sync', {
      repo_id: repoId,
      full_sync: fullSync,
    }),

  getStatus: (repoId: number) =>
    api.get<SyncStatus>(`/sync/${repoId}/status`),
};

// Metrics endpoints
export const metricsApi = {
  getSummary: (repoId: number) =>
    api.get<RepositorySummary>(`/metrics/${repoId}/summary`),

  getContributors: (repoId: number, limit: number = 20) =>
    api.get<{ contributors: Contributor[] }>(`/metrics/${repoId}/contributors`, {
      params: { limit },
    }),

  getHotspots: (repoId: number, limit: number = 20) =>
    api.get<{ hotspots: FileHotspot[] }>(`/metrics/${repoId}/hotspots`, {
      params: { limit },
    }),

  getDailyMetrics: (repoId: number, days: number = 30) =>
    api.get<{ daily_metrics: DailyMetric[] }>(`/metrics/${repoId}/daily`, {
      params: { days },
    }),

  getChurn: (repoId: number, days: number = 30) =>
    api.get<ChurnMetrics>(`/metrics/${repoId}/churn`, {
      params: { days },
    }),

  getVelocity: (repoId: number, weeks: number = 12) =>
    api.get<VelocityMetrics>(`/metrics/${repoId}/velocity`, {
      params: { weeks },
    }),

  getBusFactor: (repoId: number) =>
    api.get<BusFactorMetrics>(`/metrics/${repoId}/bus-factor`),

  getCommitPatterns: (repoId: number) =>
    api.get<CommitPatterns>(`/metrics/${repoId}/commit-patterns`),

  getQuality: (repoId: number) =>
    api.get<QualityIndicators>(`/metrics/${repoId}/quality`),

  getContributorInsights: (repoId: number) =>
    api.get<ContributorInsights>(`/metrics/${repoId}/contributor-insights`),

  getComprehensive: (repoId: number) =>
    api.get<ComprehensiveMetrics>(`/metrics/${repoId}/comprehensive`),
};

// Cross-repository metrics endpoints
export const crossRepoMetricsApi = {
  getAllSummary: () =>
    api.get<AllRepositoriesSummary>('/metrics/all/summary'),

  getComparison: (metric: 'commits' | 'contributors' | 'churn' = 'commits') =>
    api.get<RepositoryComparison>('/metrics/all/comparison', {
      params: { metric },
    }),

  getAllContributors: (limit: number = 50) =>
    api.get<{ contributors: CrossRepositoryContributor[] }>('/metrics/all/contributors', {
      params: { limit },
    }),

  getAllChurn: (days: number = 30) =>
    api.get<CrossRepositoryChurn>('/metrics/all/churn', {
      params: { days },
    }),

  getContributorDetails: (email: string) =>
    api.get<ContributorDetails>(`/metrics/contributor/${encodeURIComponent(email)}`),
};

export default api;

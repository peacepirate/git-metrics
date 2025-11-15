export interface Repository {
  id: number;
  name: string;
  url: string;
  provider: string;
  last_sync: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface Contributor {
  id: number;
  author_name: string;
  author_email: string;
  total_commits: number;
  total_lines_added: number;
  total_lines_deleted: number;
  total_lines_changed: number;
  first_commit_date: string;
  last_commit_date: string;
  commit_percentage?: number;
  lines_percentage?: number;
  avg_commit_size?: number;
  role?: string;
}

export interface FileHotspot {
  id: number;
  file_path: string;
  change_count: number;
  total_lines_changed: number;
  unique_contributors: number;
  last_changed: string;
}

export interface DailyMetric {
  id: number;
  date: string;
  commits: number;
  lines_added: number;
  lines_deleted: number;
  active_contributors: number;
  files_changed: number;
}

export interface RepositorySummary {
  total_commits: number;
  total_contributors: number;
  total_lines_added: number;
  total_lines_deleted: number;
  total_lines_changed: number;
  first_commit: string;
  last_commit: string;
}

export interface ChurnMetrics {
  total_churn: number;
  file_churn: Array<{
    file_path: string;
    churn: number;
    change_frequency: number;
    contributors: number;
  }>;
  developer_churn: Array<{
    author_name: string;
    author_email: string;
    churn: number;
    added: number;
    deleted: number;
    commits: number;
  }>;
  period_days: number;
}

export interface VelocityMetrics {
  weekly_metrics: Array<{
    week: string;
    commits: number;
    lines_added: number;
    lines_deleted: number;
    lines_changed: number;
    active_contributors: number;
  }>;
  commit_trend_percentage: number;
  weeks_analyzed: number;
}

export interface BusFactorMetrics {
  bus_factor: number;
  total_files: number;
  files_with_single_owner: number;
  single_owner_percentage: number;
  high_risk_files: Array<{
    file_path: string;
    primary_owner: string;
    ownership_percentage: number;
    total_changes: number;
  }>;
  contributor_distribution: Contributor[];
}

export interface CommitPatterns {
  hourly_distribution: number[];
  daily_distribution: number[];
  peak_hour: number;
  peak_day: number;
}

export interface QualityIndicators {
  average_commit_size: number;
  average_files_per_commit: number;
  message_quality_score: number;
  file_hotspots: FileHotspot[];
}

export interface ContributorInsights {
  total_contributors: number;
  active_contributors_last_30_days: number;
  contributors: Contributor[];
  top_contributors: Contributor[];
}

export interface ComprehensiveMetrics {
  summary: RepositorySummary;
  churn: ChurnMetrics;
  velocity: VelocityMetrics;
  bus_factor: BusFactorMetrics;
  commit_patterns: CommitPatterns;
  quality_indicators: QualityIndicators;
  contributors: ContributorInsights;
}

export interface SyncStatus {
  status: 'not_started' | 'running' | 'completed' | 'error';
  progress?: number;
  message?: string;
  commits_processed?: number;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type ProviderType = 'gitlab' | 'github'
export type AuthMethod = 'pat' | 'oauth'

export interface Account {
  id: string
  provider: ProviderType
  displayName: string
  username: string
  avatarUrl: string
  baseUrl: string // e.g. 'https://gitlab.com' or self-hosted URL
  authMethod: AuthMethod
  // Tokens are NOT stored here — held encrypted in main process via safeStorage
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export interface Repo {
  id: number
  accountId: string
  name: string
  fullPath: string // namespace/project-name
  description: string | null
  defaultBranch: string
  webUrl: string
  avatarUrl: string | null
  primaryLanguage: string | null
  visibility: 'public' | 'internal' | 'private'
  starCount: number
  openMrCount: number
  lastActivityAt: string // ISO 8601
  lastPipelineStatus: PipelineStatus | null
}

// ---------------------------------------------------------------------------
// Merge Request
// ---------------------------------------------------------------------------

export type MRState = 'opened' | 'closed' | 'locked' | 'merged'
export type MRDetailedMergeStatus =
  | 'blocked_status'
  | 'broken_status'
  | 'checking'
  | 'ci_must_pass'
  | 'ci_still_running'
  | 'discussions_not_resolved'
  | 'draft_status'
  | 'external_status_checks'
  | 'mergeable'
  | 'missing_label'
  | 'need_rebase'
  | 'not_approved'
  | 'not_open'
  | 'policies_denied'
  | 'unchecked'

export interface MRAuthor {
  id: number
  name: string
  username: string
  avatarUrl: string
  webUrl: string
}

export interface Label {
  id: number
  name: string
  color: string
  textColor: string
}

export interface Milestone {
  id: number
  title: string
  dueDate: string | null
}

export interface MergeRequest {
  id: number
  iid: number // project-level IID used in API calls
  accountId: string
  repoId: number
  repoFullPath: string
  title: string
  description: string | null
  state: MRState
  isDraft: boolean
  author: MRAuthor
  assignees: MRAuthor[]
  reviewers: MRAuthor[]
  labels: Label[]
  milestone: Milestone | null
  sourceBranch: string
  targetBranch: string
  webUrl: string
  createdAt: string
  updatedAt: string
  mergedAt: string | null
  closedAt: string | null
  threadCount: number
  unresolvedThreadCount: number
  userNotesCount: number
  approvalsRequired: number
  approvalsGiven: number
  hasConflicts: boolean
  detailedMergeStatus: MRDetailedMergeStatus
  pipelineStatus: PipelineStatus | null
  pipelineWebUrl: string | null
  diffRefs: DiffRefs | null
  allowedMergeStrategies: MergeStrategy[]
}

export type MergeStrategy = 'merge' | 'squash' | 'rebase_merge'

export interface DiffRefs {
  baseSha: string
  headSha: string
  startSha: string
}

// ---------------------------------------------------------------------------
// Diff & Threads
// ---------------------------------------------------------------------------

export interface DiffFile {
  oldPath: string
  newPath: string
  isNew: boolean
  isDeleted: boolean
  isRenamed: boolean
  isBinary: boolean
  addedLines: number
  removedLines: number
  diffType: 'text' | 'image' | 'binary'
}

export interface FilePair {
  filePath: string
  original: string // full file content at base SHA
  modified: string // full file content at head SHA
  language: string // for Monaco syntax highlighting
}

export interface Thread {
  id: string
  mrIid: number
  repoId: number
  accountId: string
  type: 'DiffNote' | 'Note'
  resolved: boolean
  resolvable: boolean
  position: ThreadPosition | null
  notes: Note[]
  createdAt: string
  updatedAt: string
}

export interface ThreadPosition {
  baseSha: string
  headSha: string
  startSha: string
  oldPath: string
  newPath: string
  oldLine: number | null
  newLine: number | null
  lineType: 'new' | 'old' | 'context' | null
}

export interface Note {
  id: number
  author: MRAuthor
  body: string
  createdAt: string
  updatedAt: string
  resolved: boolean
  isDraft: boolean
  system: boolean
}

// ---------------------------------------------------------------------------
// Pipeline & Jobs
// ---------------------------------------------------------------------------

export type PipelineStatus =
  | 'created'
  | 'waiting_for_resource'
  | 'preparing'
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'canceled'
  | 'skipped'
  | 'manual'
  | 'scheduled'

export type PipelineTrigger = 'push' | 'web' | 'trigger' | 'schedule' | 'api' | 'merge_request_event' | 'external_pull_request_event' | 'parent_pipeline' | 'ondemand_dast_scan' | 'ondemand_dast_validation'

export interface Pipeline {
  id: number
  accountId: string
  repoId: number
  repoFullPath: string
  status: PipelineStatus
  ref: string
  sha: string
  source: PipelineTrigger
  webUrl: string
  createdAt: string
  updatedAt: string
  startedAt: string | null
  finishedAt: string | null
  duration: number | null // seconds
  coverage: number | null // percentage 0–100
  mrIid: number | null
}

export interface Stage {
  name: string
  status: PipelineStatus
  jobs: Job[]
}

export type JobStatus = PipelineStatus

export interface Job {
  id: number
  pipelineId: number
  accountId: string
  repoId: number
  name: string
  stage: string
  status: JobStatus
  webUrl: string
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  duration: number | null
  allowFailure: boolean
  artifacts: Artifact[]
}

export interface Artifact {
  id: number
  jobId: number
  filename: string
  size: number // bytes
  fileType: string
  fileFormat: 'zip' | 'gzip' | 'tgz' | 'raw' | 'plain' | string
  downloadUrl: string | null
}

// ---------------------------------------------------------------------------
// Test Report
// ---------------------------------------------------------------------------

export interface TestReport {
  pipelineId: number
  totalTime: number
  totalCount: number
  successCount: number
  failedCount: number
  skippedCount: number
  errorCount: number
  testSuites: TestSuite[]
}

export interface TestSuite {
  name: string
  totalTime: number
  totalCount: number
  successCount: number
  failedCount: number
  skippedCount: number
  errorCount: number
  testCases: TestCase[]
}

export interface TestCase {
  status: 'success' | 'failed' | 'skipped' | 'error'
  name: string
  classname: string
  executionTime: number
  systemOutput: string | null
  stackTrace: string | null
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationEventType =
  | 'mr_assigned'
  | 'mr_review_requested'
  | 'mr_approved'
  | 'mr_changes_requested'
  | 'mr_merged'
  | 'mr_closed'
  | 'mr_comment'
  | 'mr_thread_resolved'
  | 'pipeline_failed'
  | 'pipeline_succeeded'
  | 'pipeline_running'
  | 'job_failed'
  | 'push'
  | 'new_mr'

export interface AppNotification {
  id: string
  accountId: string
  eventType: NotificationEventType
  title: string
  body: string
  entityId: number // MR iid, pipeline id, etc.
  entityType: 'mr' | 'pipeline' | 'job'
  repoId: number
  repoFullPath: string
  webUrl: string
  read: boolean
  snoozedUntil: string | null // ISO 8601
  createdAt: string
}

export interface NotificationPreferences {
  accountId: string
  enabledEvents: NotificationEventType[]
  quietHoursStart: string | null // HH:MM format
  quietHoursEnd: string | null
  soundEnabled: boolean
  nativeEnabled: boolean
  inAppEnabled: boolean
}

export interface SnoozedMR {
  mrIid: number
  repoId: number
  accountId: string
  snoozedUntil: string // ISO 8601
}

export interface MutedRepo {
  repoId: number
  accountId: string
  mutedUntil: string | null // null = indefinite
}

// ---------------------------------------------------------------------------
// Polling Config
// ---------------------------------------------------------------------------

export type PollingEntity = 'myWork' | 'repos' | 'mergeRequests' | 'pipelines' | 'jobs' | 'activity'

export interface PollingConfig {
  accountId: string
  entity: PollingEntity
  intervalSeconds: number
  enabled: boolean
}

export const DEFAULT_POLLING_INTERVALS: Record<PollingEntity, number> = {
  myWork: 60,
  repos: 300,
  mergeRequests: 60,
  pipelines: 30,
  jobs: 15,
  activity: 120
}

// ---------------------------------------------------------------------------
// Activity Feed
// ---------------------------------------------------------------------------

export interface ActivityEvent {
  id: string
  accountId: string
  repoId: number
  repoFullPath: string
  eventType: NotificationEventType
  actor: MRAuthor
  title: string
  body: string | null
  entityId: number
  entityType: 'mr' | 'pipeline' | 'push'
  webUrl: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// IPC response envelope
// ---------------------------------------------------------------------------

export interface IPCResult<T> {
  ok: boolean
  data?: T
  error?: IPCError
  isStale?: boolean
  lastFetched?: string // ISO 8601
}

export interface IPCError {
  code: string
  message: string
  status?: number
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export type TabType =
  | 'my-work'
  | 'repos'
  | 'mr-list'
  | 'mr-review'
  | 'pipelines'
  | 'pipeline-detail'
  | 'activity'
  | 'notifications'
  | 'settings'
  | 'home'
  | 'repo'
  | 'mr'
  | 'pipeline'
  | 'pipeline-list'
  | 'job'
  | 'repo-list'
  | 'onboarding'

export interface AppTab {
  id: string
  type: TabType
  title: string
  isPinned?: boolean
  icon?: string
  route?: string
  // Route state — what the tab is currently showing
  routeState: TabRouteState | Record<string, unknown>
}

export type TabRouteState =
  | { type: 'my-work' }
  | { type: 'repos'; accountId: string }
  | { type: 'mr-list'; accountId?: string; repoId?: number }
  | { type: 'mr-review'; accountId: string; repoId: number; mrIid: number }
  | { type: 'pipelines'; accountId?: string; repoId?: number }
  | { type: 'pipeline-detail'; accountId: string; repoId: number; pipelineId: number }
  | { type: 'activity'; accountId?: string }
  | { type: 'notifications' }
  | { type: 'settings'; section?: SettingsSection }

export type SettingsSection = 'accounts' | 'notifications' | 'appearance' | 'updates' | 'advanced'


import {
  Repo,
  MergeRequest,
  DiffFile,
  FilePair,
  Thread,
  Note,
  Pipeline,
  Stage,
  Job,
  Artifact,
  TestReport,
  ActivityEvent,
  MergeStrategy
} from '../../shared/types'

// ---------------------------------------------------------------------------
// Input types for write operations
// ---------------------------------------------------------------------------

export interface CreateMRInput {
  repoId: number
  sourceBranch: string
  targetBranch: string
  title: string
  description?: string
  assigneeIds?: number[]
  reviewerIds?: number[]
  labelIds?: number[]
  milestoneId?: number
  squash?: boolean
  removeSourceBranch?: boolean
}

export interface PostCommentInput {
  repoId: number
  mrIid: number
  body: string
  position?: {
    baseSha: string
    headSha: string
    startSha: string
    oldPath: string
    newPath: string
    oldLine?: number
    newLine?: number
    lineType: 'new' | 'old' | 'context'
  }
}

export interface SubmitReviewInput {
  repoId: number
  mrIid: number
  body?: string
  action: 'comment' | 'approve' | 'request_changes'
  draftNoteIds: number[]
}

export interface MergeInput {
  repoId: number
  mrIid: number
  strategy: MergeStrategy
  commitMessage?: string
  squashCommitMessage?: string
  shouldRemoveSourceBranch?: boolean
}

export interface TriggerPipelineInput {
  repoId: number
  ref: string
  variables?: { key: string; value: string; variableType?: 'env_var' | 'file' }[]
}

// ---------------------------------------------------------------------------
// List/filter options
// ---------------------------------------------------------------------------

export interface ListMROptions {
  repoId?: number
  state?: 'opened' | 'closed' | 'merged' | 'all'
  authorId?: number
  assigneeId?: number
  reviewerId?: number
  labelNames?: string[]
  milestoneTitle?: string
  isDraft?: boolean
  search?: string
  page?: number
  perPage?: number
}

export interface ListPipelineOptions {
  repoId?: number
  status?: string
  ref?: string
  source?: string
  page?: number
  perPage?: number
}

// ---------------------------------------------------------------------------
// IGitProvider — the extensibility contract
// All provider implementations (GitLab, GitHub, etc.) must satisfy this interface.
// ---------------------------------------------------------------------------

export interface IGitProvider {
  readonly accountId: string
  readonly providerType: 'gitlab' | 'github'

  // -- Repositories --
  listRepos(options?: { page?: number; perPage?: number; search?: string }): Promise<Repo[]>
  getRepo(repoId: number): Promise<Repo>
  listBranches(repoId: number, search?: string): Promise<{ name: string; isDefault: boolean }[]>

  // -- My Work --
  getMyWork(): Promise<{
    needsReview: MergeRequest[]
    assignedToMe: MergeRequest[]
    myOpenMRs: MergeRequest[]
    myPipelines: Pipeline[]
  }>

  // -- Merge Requests --
  listMergeRequests(options: ListMROptions): Promise<MergeRequest[]>
  getMergeRequest(repoId: number, mrIid: number): Promise<MergeRequest>
  createMergeRequest(input: CreateMRInput): Promise<MergeRequest>
  getMergeOptions(repoId: number, mrIid: number): Promise<MergeStrategy[]>

  getDiffFiles(repoId: number, mrIid: number): Promise<DiffFile[]>
  getFilePair(repoId: number, mrIid: number, filePath: string): Promise<FilePair>

  getThreads(repoId: number, mrIid: number): Promise<Thread[]>
  postComment(input: PostCommentInput): Promise<Note>
  postDraftNote(input: PostCommentInput): Promise<Note>
  submitReview(input: SubmitReviewInput): Promise<void>
  discardDraftNotes(repoId: number, mrIid: number): Promise<void>
  resolveThread(repoId: number, mrIid: number, threadId: string, resolved: boolean): Promise<void>

  approveMR(repoId: number, mrIid: number): Promise<void>
  unapproveMR(repoId: number, mrIid: number): Promise<void>
  requestChanges(repoId: number, mrIid: number, body?: string): Promise<void>
  mergeMR(input: MergeInput): Promise<void>
  closeMR(repoId: number, mrIid: number): Promise<void>

  // -- Pipelines --
  listPipelines(options: ListPipelineOptions): Promise<Pipeline[]>
  getPipeline(repoId: number, pipelineId: number): Promise<Pipeline>
  getPipelineStages(repoId: number, pipelineId: number): Promise<Stage[]>
  triggerPipeline(input: TriggerPipelineInput): Promise<Pipeline>
  cancelPipeline(repoId: number, pipelineId: number): Promise<void>
  retryPipeline(repoId: number, pipelineId: number): Promise<void>
  getTestReport(repoId: number, pipelineId: number): Promise<TestReport | null>

  // -- Jobs --
  listJobs(repoId: number, pipelineId: number): Promise<Job[]>
  getJob(repoId: number, jobId: number): Promise<Job>
  retryJob(repoId: number, jobId: number): Promise<Job>
  cancelJob(repoId: number, jobId: number): Promise<Job>
  streamJobLog(
    repoId: number,
    jobId: number,
    onChunk: (chunk: string) => void,
    onDone: () => void
  ): Promise<void>
  listArtifacts(repoId: number, jobId: number): Promise<Artifact[]>
  downloadArtifact(
    repoId: number,
    jobId: number,
    artifactId: number,
    destPath: string,
    onProgress: (percent: number) => void
  ): Promise<void>

  // -- Activity --
  listActivity(options?: {
    repoId?: number
    page?: number
    perPage?: number
  }): Promise<ActivityEvent[]>

  // -- Auth --
  validateToken(): Promise<{ valid: boolean; username: string; avatarUrl: string }>
  refreshToken(): Promise<void>
  getCurrentUser(): Promise<{ id: number; username: string; name: string; avatarUrl: string }>
}

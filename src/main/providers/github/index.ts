import { IGitProvider, CreateMRInput, PostCommentInput, SubmitReviewInput, MergeInput, TriggerPipelineInput, ListMROptions, ListPipelineOptions } from '../IGitProvider'
import {
  Repo, MergeRequest, DiffFile, FilePair, Thread, Note,
  Pipeline, Stage, Job, Artifact, TestReport, ActivityEvent, MergeStrategy
} from '../../../shared/types'

// ---------------------------------------------------------------------------
// GitHubProvider — stub implementation
// All methods throw NotImplementedError until GitHub support is built.
// ---------------------------------------------------------------------------

class NotImplementedError extends Error {
  constructor(method: string) {
    super(
      `GitHub provider is not yet implemented. Method "${method}" is not available. ` +
        `Please use a GitLab account to access this feature.`
    )
    this.name = 'NotImplementedError'
  }
}

export class GitHubProvider implements IGitProvider {
  readonly accountId: string
  readonly providerType = 'github' as const

  constructor(accountId: string) {
    this.accountId = accountId
  }

  listRepos(): Promise<Repo[]> { throw new NotImplementedError('listRepos') }
  getRepo(): Promise<Repo> { throw new NotImplementedError('getRepo') }
  listBranches(): Promise<{ name: string; isDefault: boolean }[]> { throw new NotImplementedError('listBranches') }
  getMyWork(): Promise<{ needsReview: MergeRequest[]; assignedToMe: MergeRequest[]; myOpenMRs: MergeRequest[]; myPipelines: Pipeline[] }> { throw new NotImplementedError('getMyWork') }
  listMergeRequests(_options: ListMROptions): Promise<MergeRequest[]> { throw new NotImplementedError('listMergeRequests') }
  getMergeRequest(): Promise<MergeRequest> { throw new NotImplementedError('getMergeRequest') }
  createMergeRequest(_input: CreateMRInput): Promise<MergeRequest> { throw new NotImplementedError('createMergeRequest') }
  getMergeOptions(): Promise<MergeStrategy[]> { throw new NotImplementedError('getMergeOptions') }
  getDiffFiles(): Promise<DiffFile[]> { throw new NotImplementedError('getDiffFiles') }
  getFilePair(): Promise<FilePair> { throw new NotImplementedError('getFilePair') }
  getThreads(): Promise<Thread[]> { throw new NotImplementedError('getThreads') }
  postComment(_input: PostCommentInput): Promise<Note> { throw new NotImplementedError('postComment') }
  postDraftNote(_input: PostCommentInput): Promise<Note> { throw new NotImplementedError('postDraftNote') }
  submitReview(_input: SubmitReviewInput): Promise<void> { throw new NotImplementedError('submitReview') }
  discardDraftNotes(): Promise<void> { throw new NotImplementedError('discardDraftNotes') }
  resolveThread(): Promise<void> { throw new NotImplementedError('resolveThread') }
  approveMR(): Promise<void> { throw new NotImplementedError('approveMR') }
  unapproveMR(): Promise<void> { throw new NotImplementedError('unapproveMR') }
  requestChanges(): Promise<void> { throw new NotImplementedError('requestChanges') }
  mergeMR(_input: MergeInput): Promise<void> { throw new NotImplementedError('mergeMR') }
  closeMR(): Promise<void> { throw new NotImplementedError('closeMR') }
  listPipelines(_options: ListPipelineOptions): Promise<Pipeline[]> { throw new NotImplementedError('listPipelines') }
  getPipeline(): Promise<Pipeline> { throw new NotImplementedError('getPipeline') }
  getPipelineStages(): Promise<Stage[]> { throw new NotImplementedError('getPipelineStages') }
  triggerPipeline(_input: TriggerPipelineInput): Promise<Pipeline> { throw new NotImplementedError('triggerPipeline') }
  cancelPipeline(): Promise<void> { throw new NotImplementedError('cancelPipeline') }
  retryPipeline(): Promise<void> { throw new NotImplementedError('retryPipeline') }
  getTestReport(): Promise<TestReport | null> { throw new NotImplementedError('getTestReport') }
  listJobs(): Promise<Job[]> { throw new NotImplementedError('listJobs') }
  getJob(): Promise<Job> { throw new NotImplementedError('getJob') }
  retryJob(): Promise<Job> { throw new NotImplementedError('retryJob') }
  cancelJob(): Promise<Job> { throw new NotImplementedError('cancelJob') }
  streamJobLog(): Promise<void> { throw new NotImplementedError('streamJobLog') }
  listArtifacts(): Promise<Artifact[]> { throw new NotImplementedError('listArtifacts') }
  downloadArtifact(): Promise<void> { throw new NotImplementedError('downloadArtifact') }
  listActivity(): Promise<ActivityEvent[]> { throw new NotImplementedError('listActivity') }
  validateToken(): Promise<{ valid: boolean; username: string; avatarUrl: string }> { throw new NotImplementedError('validateToken') }
  refreshToken(): Promise<void> { throw new NotImplementedError('refreshToken') }
  getCurrentUser(): Promise<{ id: number; username: string; name: string; avatarUrl: string }> { throw new NotImplementedError('getCurrentUser') }
}

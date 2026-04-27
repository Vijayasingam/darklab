import { AxiosInstance } from 'axios'
import { IGitProvider, CreateMRInput, PostCommentInput, SubmitReviewInput, MergeInput, TriggerPipelineInput, ListMROptions, ListPipelineOptions } from '../IGitProvider'
import {
  Repo, MergeRequest, DiffFile, FilePair, Thread, Note,
  Pipeline, Stage, Job, Artifact, TestReport, ActivityEvent,
  MergeStrategy
} from '../../../shared/types'
import { createApiClient, getApiClient } from './api'
import {
  transformRepo, transformMR, transformDiffFile, transformThread,
  transformPipeline, transformJob, transformTestReport
} from './transforms'
import axios from 'axios'
import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'

// Language detection from file extension (lightweight, no extra dep)
function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    cs: 'csharp', cpp: 'cpp', c: 'c', h: 'c', php: 'php',
    swift: 'swift', kt: 'kotlin', scala: 'scala', ex: 'elixir',
    html: 'html', css: 'css', scss: 'scss', json: 'json',
    yaml: 'yaml', yml: 'yaml', md: 'markdown', sh: 'shell',
    dockerfile: 'dockerfile', tf: 'hcl', sql: 'sql', xml: 'xml'
  }
  return map[ext] ?? 'plaintext'
}

export class GitLabProvider implements IGitProvider {
  readonly accountId: string
  readonly providerType = 'gitlab' as const
  private readonly baseUrl: string
  private readonly api: AxiosInstance

  constructor(accountId: string, baseUrl: string) {
    this.accountId = accountId
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.api = createApiClient(accountId, baseUrl)
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  async validateToken(): Promise<{ valid: boolean; username: string; avatarUrl: string }> {
    const { data } = await this.api.get('/user')
    return { valid: true, username: data.username, avatarUrl: data.avatar_url }
  }

  async refreshToken(): Promise<void> {
    // Handled by axios interceptor in api.ts
  }

  async getCurrentUser(): Promise<{ id: number; username: string; name: string; avatarUrl: string }> {
    const { data } = await this.api.get('/user')
    return { id: data.id, username: data.username, name: data.name, avatarUrl: data.avatar_url }
  }

  // ---------------------------------------------------------------------------
  // Repositories
  // ---------------------------------------------------------------------------

  async listRepos(options?: { page?: number; perPage?: number; search?: string }): Promise<Repo[]> {
    const { data } = await this.api.get('/projects', {
      params: {
        membership: true,
        order_by: 'last_activity_at',
        sort: 'desc',
        per_page: options?.perPage ?? 50,
        page: options?.page ?? 1,
        search: options?.search,
        with_issues_enabled: false,
        with_merge_requests_enabled: true
      }
    })
    return (data as Record<string, unknown>[]).map((r) => transformRepo(r, this.accountId))
  }

  async getRepo(repoId: number): Promise<Repo> {
    const { data } = await this.api.get(`/projects/${repoId}`)
    return transformRepo(data, this.accountId)
  }

  async listBranches(repoId: number, search?: string): Promise<{ name: string; isDefault: boolean }[]> {
    const { data: project } = await this.api.get(`/projects/${repoId}`)
    const { data } = await this.api.get(`/projects/${repoId}/repository/branches`, {
      params: { search, per_page: 100 }
    })
    const defaultBranch: string = project.default_branch
    return (data as Record<string, unknown>[]).map((b) => ({
      name: b['name'] as string,
      isDefault: b['name'] === defaultBranch
    }))
  }

  // ---------------------------------------------------------------------------
  // My Work
  // ---------------------------------------------------------------------------

  async getMyWork(): Promise<{
    needsReview: MergeRequest[]
    assignedToMe: MergeRequest[]
    myOpenMRs: MergeRequest[]
    myPipelines: Pipeline[]
  }> {
    const [reviewerRes, assigneeRes, authorRes] = await Promise.all([
      this.api.get('/merge_requests', {
        params: { reviewer_id: 'Any', scope: 'all', state: 'opened', per_page: 20 }
      }),
      this.api.get('/merge_requests', {
        params: { assignee_id: 'Any', scope: 'assigned_to_me', state: 'opened', per_page: 20 }
      }),
      this.api.get('/merge_requests', {
        params: { scope: 'created_by_me', state: 'opened', per_page: 20 }
      })
    ])

    // Recent pipelines for the current user
    const { data: pipelinesData } = await this.api.get('/pipelines', {
      params: { scope: 'owned', per_page: 10, order_by: 'updated_at', sort: 'desc' }
    }).catch(() => ({ data: [] }))

    const mapMR = (r: Record<string, unknown>) => transformMR(r, this.accountId)
    const mapPipeline = (r: Record<string, unknown>) =>
      transformPipeline(r, this.accountId, r['project_id'] as number, '')

    return {
      needsReview: (reviewerRes.data as Record<string, unknown>[]).map(mapMR),
      assignedToMe: (assigneeRes.data as Record<string, unknown>[]).map(mapMR),
      myOpenMRs: (authorRes.data as Record<string, unknown>[]).map(mapMR),
      myPipelines: (pipelinesData as Record<string, unknown>[]).map(mapPipeline)
    }
  }

  // ---------------------------------------------------------------------------
  // Merge Requests
  // ---------------------------------------------------------------------------

  async listMergeRequests(options: ListMROptions): Promise<MergeRequest[]> {
    const endpoint = options.repoId
      ? `/projects/${options.repoId}/merge_requests`
      : '/merge_requests'

    const { data } = await this.api.get(endpoint, {
      params: {
        state: options.state ?? 'opened',
        author_id: options.authorId,
        assignee_id: options.assigneeId,
        reviewer_id: options.reviewerId,
        labels: options.labelNames?.join(','),
        milestone: options.milestoneTitle,
        wip: options.isDraft === true ? 'yes' : options.isDraft === false ? 'no' : undefined,
        search: options.search,
        per_page: options.perPage ?? 50,
        page: options.page ?? 1,
        scope: options.repoId ? undefined : 'all',
        order_by: 'updated_at',
        sort: 'desc'
      }
    })

    return (data as Record<string, unknown>[]).map((r) => transformMR(r, this.accountId))
  }

  async getMergeRequest(repoId: number, mrIid: number): Promise<MergeRequest> {
    const { data } = await this.api.get(`/projects/${repoId}/merge_requests/${mrIid}`)
    return transformMR(data, this.accountId)
  }

  async createMergeRequest(input: CreateMRInput): Promise<MergeRequest> {
    const { data } = await this.api.post(`/projects/${input.repoId}/merge_requests`, {
      source_branch: input.sourceBranch,
      target_branch: input.targetBranch,
      title: input.title,
      description: input.description,
      assignee_ids: input.assigneeIds,
      reviewer_ids: input.reviewerIds,
      label_ids: input.labelIds,
      milestone_id: input.milestoneId,
      squash: input.squash,
      remove_source_branch: input.removeSourceBranch
    })
    return transformMR(data, this.accountId)
  }

  async getMergeOptions(repoId: number, _mrIid: number): Promise<MergeStrategy[]> {
    const { data } = await this.api.get(`/projects/${repoId}`)
    const strategies: MergeStrategy[] = ['merge']
    if (data.squash_option !== 'never') strategies.push('squash')
    if (data.merge_method === 'rebase_merge') strategies.push('rebase_merge')
    return strategies
  }

  async getDiffFiles(repoId: number, mrIid: number): Promise<DiffFile[]> {
    const { data } = await this.api.get(
      `/projects/${repoId}/merge_requests/${mrIid}/diffs`,
      { params: { per_page: 100 } }
    )
    return (data as Record<string, unknown>[]).map(transformDiffFile)
  }

  async getFilePair(repoId: number, mrIid: number, filePath: string): Promise<FilePair> {
    const { data: mr } = await this.api.get(`/projects/${repoId}/merge_requests/${mrIid}`)
    const { baseSha, headSha } = {
      baseSha: mr.diff_refs?.base_sha as string,
      headSha: mr.diff_refs?.head_sha as string
    }

    const encode = (p: string) => encodeURIComponent(p)

    const [originalRes, modifiedRes] = await Promise.allSettled([
      this.api.get(`/projects/${repoId}/repository/files/${encode(filePath)}/raw`, {
        params: { ref: baseSha }
      }),
      this.api.get(`/projects/${repoId}/repository/files/${encode(filePath)}/raw`, {
        params: { ref: headSha }
      })
    ])

    const original = originalRes.status === 'fulfilled' ? (originalRes.value.data as string) : ''
    const modified = modifiedRes.status === 'fulfilled' ? (modifiedRes.value.data as string) : ''

    return { filePath, original, modified, language: detectLanguage(filePath) }
  }

  async getThreads(repoId: number, mrIid: number): Promise<Thread[]> {
    const { data } = await this.api.get(
      `/projects/${repoId}/merge_requests/${mrIid}/discussions`,
      { params: { per_page: 100 } }
    )
    return (data as Record<string, unknown>[]).map((d) =>
      transformThread(d, this.accountId, mrIid, repoId)
    )
  }

  async postComment(input: PostCommentInput): Promise<Note> {
    const body: Record<string, unknown> = { body: input.body }
    if (input.position) {
      body['position'] = {
        base_sha: input.position.baseSha,
        head_sha: input.position.headSha,
        start_sha: input.position.startSha,
        old_path: input.position.oldPath,
        new_path: input.position.newPath,
        old_line: input.position.oldLine,
        new_line: input.position.newLine,
        position_type: 'text',
        line_type: input.position.lineType
      }
    }
    const { data } = await this.api.post(
      `/projects/${input.repoId}/merge_requests/${input.mrIid}/discussions`,
      body
    )
    const notes = data.notes as Record<string, unknown>[]
    return {
      id: notes[0]['id'] as number,
      author: {
        id: (notes[0]['author'] as Record<string, number>)['id'],
        name: (notes[0]['author'] as Record<string, string>)['name'],
        username: (notes[0]['author'] as Record<string, string>)['username'],
        avatarUrl: (notes[0]['author'] as Record<string, string>)['avatar_url'] ?? '',
        webUrl: (notes[0]['author'] as Record<string, string>)['web_url']
      },
      body: notes[0]['body'] as string,
      createdAt: notes[0]['created_at'] as string,
      updatedAt: notes[0]['updated_at'] as string,
      resolved: false,
      isDraft: false,
      system: false
    }
  }

  async postDraftNote(input: PostCommentInput): Promise<Note> {
    // GitLab draft notes use the same endpoint with `draft: true`
    const body: Record<string, unknown> = { note: input.body, draft: true }
    if (input.position) {
      body['position'] = {
        base_sha: input.position.baseSha,
        head_sha: input.position.headSha,
        start_sha: input.position.startSha,
        old_path: input.position.oldPath,
        new_path: input.position.newPath,
        old_line: input.position.oldLine,
        new_line: input.position.newLine,
        position_type: 'text',
        line_type: input.position.lineType
      }
    }
    const { data } = await this.api.post(
      `/projects/${input.repoId}/merge_requests/${input.mrIid}/draft_notes`,
      body
    )
    return {
      id: data.id as number,
      author: { id: 0, name: '', username: '', avatarUrl: '', webUrl: '' },
      body: data.note as string,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      resolved: false,
      isDraft: true,
      system: false
    }
  }

  async submitReview(input: SubmitReviewInput): Promise<void> {
    await this.api.post(
      `/projects/${input.repoId}/merge_requests/${input.mrIid}/draft_notes/bulk_publish`,
      { note: input.body ?? '' }
    )
    if (input.action === 'approve') {
      await this.approveMR(input.repoId, input.mrIid)
    }
  }

  async discardDraftNotes(repoId: number, mrIid: number): Promise<void> {
    const { data } = await this.api.get(
      `/projects/${repoId}/merge_requests/${mrIid}/draft_notes`
    )
    await Promise.all(
      (data as { id: number }[]).map((d) =>
        this.api.delete(`/projects/${repoId}/merge_requests/${mrIid}/draft_notes/${d.id}`)
      )
    )
  }

  async resolveThread(
    repoId: number,
    mrIid: number,
    threadId: string,
    resolved: boolean
  ): Promise<void> {
    await this.api.put(
      `/projects/${repoId}/merge_requests/${mrIid}/discussions/${threadId}`,
      { resolved }
    )
  }

  async approveMR(repoId: number, mrIid: number): Promise<void> {
    await this.api.post(`/projects/${repoId}/merge_requests/${mrIid}/approve`)
  }

  async unapproveMR(repoId: number, mrIid: number): Promise<void> {
    await this.api.post(`/projects/${repoId}/merge_requests/${mrIid}/unapprove`)
  }

  async requestChanges(repoId: number, mrIid: number, body?: string): Promise<void> {
    if (body) {
      await this.postComment({ repoId, mrIid, body })
    }
    // GitLab doesn't have a dedicated "request changes" endpoint like GitHub;
    // leaving a comment with an unresolved thread serves the same purpose.
  }

  async mergeMR(input: MergeInput): Promise<void> {
    await this.api.put(
      `/projects/${input.repoId}/merge_requests/${input.mrIid}/merge`,
      {
        merge_commit_message: input.commitMessage,
        squash_commit_message: input.squashCommitMessage,
        squash: input.strategy === 'squash',
        should_remove_source_branch: input.shouldRemoveSourceBranch ?? false
      }
    )
  }

  async closeMR(repoId: number, mrIid: number): Promise<void> {
    await this.api.put(`/projects/${repoId}/merge_requests/${mrIid}`, {
      state_event: 'close'
    })
  }

  // ---------------------------------------------------------------------------
  // Pipelines
  // ---------------------------------------------------------------------------

  async listPipelines(options: ListPipelineOptions): Promise<Pipeline[]> {
    const endpoint = options.repoId
      ? `/projects/${options.repoId}/pipelines`
      : '/pipelines'

    const { data } = await this.api.get(endpoint, {
      params: {
        status: options.status,
        ref: options.ref,
        source: options.source,
        per_page: options.perPage ?? 30,
        page: options.page ?? 1,
        order_by: 'updated_at',
        sort: 'desc'
      }
    })

    return (data as Record<string, unknown>[]).map((p) =>
      transformPipeline(p, this.accountId, options.repoId ?? 0, '')
    )
  }

  async getPipeline(repoId: number, pipelineId: number): Promise<Pipeline> {
    const { data } = await this.api.get(`/projects/${repoId}/pipelines/${pipelineId}`)
    return transformPipeline(data, this.accountId, repoId, '')
  }

  async getPipelineStages(repoId: number, pipelineId: number): Promise<Stage[]> {
    const { data } = await this.api.get(`/projects/${repoId}/pipelines/${pipelineId}/jobs`, {
      params: { per_page: 100 }
    })

    const jobs = (data as Record<string, unknown>[]).map((j) =>
      transformJob(j, this.accountId, repoId, pipelineId)
    )

    // Group by stage
    const stageMap = new Map<string, Job[]>()
    for (const job of jobs) {
      const stage = job.stage
      if (!stageMap.has(stage)) stageMap.set(stage, [])
      stageMap.get(stage)!.push(job)
    }

    return Array.from(stageMap.entries()).map(([name, stageJobs]) => ({
      name,
      status: stageJobs[0].status,
      jobs: stageJobs
    }))
  }

  async triggerPipeline(input: TriggerPipelineInput): Promise<Pipeline> {
    const { data } = await this.api.post(`/projects/${input.repoId}/pipeline`, {
      ref: input.ref,
      variables: input.variables ?? []
    })
    return transformPipeline(data, this.accountId, input.repoId, '')
  }

  async cancelPipeline(repoId: number, pipelineId: number): Promise<void> {
    await this.api.post(`/projects/${repoId}/pipelines/${pipelineId}/cancel`)
  }

  async retryPipeline(repoId: number, pipelineId: number): Promise<void> {
    await this.api.post(`/projects/${repoId}/pipelines/${pipelineId}/retry`)
  }

  async getTestReport(repoId: number, pipelineId: number): Promise<TestReport | null> {
    try {
      const { data } = await this.api.get(
        `/projects/${repoId}/pipelines/${pipelineId}/test_report`
      )
      return transformTestReport(data, pipelineId)
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) return null
      throw err
    }
  }

  // ---------------------------------------------------------------------------
  // Jobs
  // ---------------------------------------------------------------------------

  async listJobs(repoId: number, pipelineId: number): Promise<Job[]> {
    const { data } = await this.api.get(`/projects/${repoId}/pipelines/${pipelineId}/jobs`, {
      params: { per_page: 100 }
    })
    return (data as Record<string, unknown>[]).map((j) =>
      transformJob(j, this.accountId, repoId, pipelineId)
    )
  }

  async getJob(repoId: number, jobId: number): Promise<Job> {
    const { data } = await this.api.get(`/projects/${repoId}/jobs/${jobId}`)
    const pipelineId = (data.pipeline?.id as number) ?? 0
    return transformJob(data, this.accountId, repoId, pipelineId)
  }

  async retryJob(repoId: number, jobId: number): Promise<Job> {
    const { data } = await this.api.post(`/projects/${repoId}/jobs/${jobId}/retry`)
    return transformJob(data, this.accountId, repoId, data.pipeline?.id ?? 0)
  }

  async cancelJob(repoId: number, jobId: number): Promise<Job> {
    const { data } = await this.api.post(`/projects/${repoId}/jobs/${jobId}/cancel`)
    return transformJob(data, this.accountId, repoId, data.pipeline?.id ?? 0)
  }

  async streamJobLog(
    repoId: number,
    jobId: number,
    onChunk: (chunk: string) => void,
    onDone: () => void
  ): Promise<void> {
    const token = await this.api.get('/user').then(() => {
      // We need the raw token — get it from store
      const { retrieveToken } = require('../../services/store') as typeof import('../../services/store')
      return retrieveToken(this.accountId) ?? ''
    })

    const response = await axios.get(
      `${this.baseUrl}/api/v4/projects/${repoId}/jobs/${jobId}/trace`,
      {
        headers: { 'PRIVATE-TOKEN': token },
        responseType: 'stream'
      }
    )

    response.data.on('data', (chunk: Buffer) => {
      onChunk(chunk.toString('utf8'))
    })

    response.data.on('end', () => {
      onDone()
    })
  }

  async listArtifacts(repoId: number, jobId: number): Promise<Artifact[]> {
    const { data } = await this.api.get(`/projects/${repoId}/jobs/${jobId}`)
    const artifacts = data.artifacts as Record<string, unknown>[]
    return (artifacts ?? []).map((a, idx) => ({
      id: idx,
      jobId,
      filename: (a['filename'] as string) ?? 'artifact',
      size: (a['size'] as number) ?? 0,
      fileType: (a['file_type'] as string) ?? 'other',
      fileFormat: (a['file_format'] as string) ?? 'zip',
      downloadUrl: `${this.baseUrl}/api/v4/projects/${repoId}/jobs/${jobId}/artifacts/${a['filename'] as string}`
    }))
  }

  async downloadArtifact(
    repoId: number,
    jobId: number,
    _artifactId: number,
    destPath: string,
    onProgress: (percent: number) => void
  ): Promise<void> {
    const { retrieveToken } = await import('../../services/store')
    const token = retrieveToken(this.accountId) ?? ''

    const response = await axios.get(
      `${this.baseUrl}/api/v4/projects/${repoId}/jobs/${jobId}/artifacts`,
      {
        headers: { 'PRIVATE-TOKEN': token },
        responseType: 'stream'
      }
    )

    const totalLength = parseInt(response.headers['content-length'] ?? '0', 10)
    let downloaded = 0

    const writer = fs.createWriteStream(destPath)
    response.data.on('data', (chunk: Buffer) => {
      downloaded += chunk.length
      if (totalLength > 0) {
        onProgress(Math.round((downloaded / totalLength) * 100))
      }
    })

    await new Promise<void>((resolve, reject) => {
      response.data.pipe(writer)
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  }

  // ---------------------------------------------------------------------------
  // Activity
  // ---------------------------------------------------------------------------

  async listActivity(options?: {
    repoId?: number
    page?: number
    perPage?: number
  }): Promise<ActivityEvent[]> {
    const endpoint = options?.repoId
      ? `/projects/${options.repoId}/events`
      : '/events'

    const { data } = await this.api.get(endpoint, {
      params: {
        per_page: options?.perPage ?? 50,
        page: options?.page ?? 1,
        sort: 'desc'
      }
    })

    return (data as Record<string, unknown>[])
      .filter((e) => e['target_type'] !== null)
      .map((e) => ({
        id: `${e['id']}`,
        accountId: this.accountId,
        repoId: (e['project_id'] as number) ?? 0,
        repoFullPath: '',
        eventType: 'new_mr' as ActivityEvent['eventType'], // simplified
        actor: {
          id: (e['author'] as Record<string, number>)?.['id'] ?? 0,
          name: (e['author'] as Record<string, string>)?.['name'] ?? '',
          username: (e['author_username'] as string) ?? '',
          avatarUrl: '',
          webUrl: ''
        },
        title: `${e['action_name']} ${e['target_type'] ?? ''}`,
        body: (e['target_title'] as string | null) ?? null,
        entityId: (e['target_iid'] as number) ?? (e['target_id'] as number) ?? 0,
        entityType: 'mr' as ActivityEvent['entityType'],
        webUrl: '',
        createdAt: e['created_at'] as string
      }))
  }
}

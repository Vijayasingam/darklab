import {
  Repo, MergeRequest, MRAuthor, Label, Milestone, DiffFile,
  Thread, ThreadPosition, Note, Pipeline, PipelineStatus,
  PipelineTrigger, Job, TestReport, TestSuite,
  TestCase
} from '../../../shared/types'

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export function transformRepo(raw: Record<string, unknown>, accountId: string): Repo {
  return {
    id: raw['id'] as number,
    accountId,
    name: raw['name'] as string,
    fullPath: raw['path_with_namespace'] as string,
    description: (raw['description'] as string | null) ?? null,
    defaultBranch: (raw['default_branch'] as string) ?? 'main',
    webUrl: raw['web_url'] as string,
    avatarUrl: (raw['avatar_url'] as string | null) ?? null,
    primaryLanguage: null, // fetched separately if needed
    visibility: raw['visibility'] as Repo['visibility'],
    starCount: (raw['star_count'] as number) ?? 0,
    openMrCount: (raw['open_issues_count'] as number) ?? 0,
    lastActivityAt: raw['last_activity_at'] as string,
    lastPipelineStatus: null
  }
}

// ---------------------------------------------------------------------------
// Merge Request
// ---------------------------------------------------------------------------

function transformAuthor(raw: Record<string, unknown>): MRAuthor {
  return {
    id: raw['id'] as number,
    name: raw['name'] as string,
    username: raw['username'] as string,
    avatarUrl: (raw['avatar_url'] as string) ?? '',
    webUrl: raw['web_url'] as string
  }
}

function transformLabel(raw: Record<string, unknown>): Label {
  return {
    id: raw['id'] as number,
    name: raw['name'] as string,
    color: raw['color'] as string,
    textColor: (raw['text_color'] as string) ?? '#ffffff'
  }
}

function transformMilestone(raw: Record<string, unknown> | null): Milestone | null {
  if (!raw) return null
  return {
    id: raw['id'] as number,
    title: raw['title'] as string,
    dueDate: (raw['due_date'] as string | null) ?? null
  }
}

export function transformMR(
  raw: Record<string, unknown>,
  accountId: string
): MergeRequest {
  const repoId = (raw['project_id'] as number)
  return {
    id: raw['id'] as number,
    iid: raw['iid'] as number,
    accountId,
    repoId,
    repoFullPath: (raw['references'] as Record<string, string>)?.['full'] ?? '',
    title: raw['title'] as string,
    description: (raw['description'] as string | null) ?? null,
    state: raw['state'] as MergeRequest['state'],
    isDraft: (raw['draft'] as boolean) ?? false,
    author: transformAuthor(raw['author'] as Record<string, unknown>),
    assignees: ((raw['assignees'] as unknown[]) ?? []).map((a) =>
      transformAuthor(a as Record<string, unknown>)
    ),
    reviewers: ((raw['reviewers'] as unknown[]) ?? []).map((r) =>
      transformAuthor(r as Record<string, unknown>)
    ),
    labels: ((raw['labels'] as unknown[]) ?? []).map((l) => {
      if (typeof l === 'string') {
        return { id: 0, name: l, color: '#6b7280', textColor: '#ffffff' }
      }
      return transformLabel(l as Record<string, unknown>)
    }),
    milestone: transformMilestone(
      (raw['milestone'] as Record<string, unknown> | null) ?? null
    ),
    sourceBranch: raw['source_branch'] as string,
    targetBranch: raw['target_branch'] as string,
    webUrl: raw['web_url'] as string,
    createdAt: raw['created_at'] as string,
    updatedAt: raw['updated_at'] as string,
    mergedAt: (raw['merged_at'] as string | null) ?? null,
    closedAt: (raw['closed_at'] as string | null) ?? null,
    threadCount: (raw['user_notes_count'] as number) ?? 0,
    unresolvedThreadCount: (raw['blocking_discussions_resolved'] as boolean) ? 0 : 0,
    userNotesCount: (raw['user_notes_count'] as number) ?? 0,
    approvalsRequired: 0, // fetched from approvals endpoint
    approvalsGiven: 0,
    hasConflicts: (raw['has_conflicts'] as boolean) ?? false,
    detailedMergeStatus: (raw['detailed_merge_status'] as MergeRequest['detailedMergeStatus']) ?? 'unchecked',
    pipelineStatus: (raw['head_pipeline'] as Record<string, unknown> | null)?.['status'] as PipelineStatus | null ?? null,
    pipelineWebUrl: (raw['head_pipeline'] as Record<string, unknown> | null)?.['web_url'] as string | null ?? null,
    diffRefs: raw['diff_refs']
      ? {
          baseSha: (raw['diff_refs'] as Record<string, string>)['base_sha'],
          headSha: (raw['diff_refs'] as Record<string, string>)['head_sha'],
          startSha: (raw['diff_refs'] as Record<string, string>)['start_sha']
        }
      : null,
    allowedMergeStrategies: []
  }
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

export function transformDiffFile(raw: Record<string, unknown>): DiffFile {
  return {
    oldPath: (raw['old_path'] as string) ?? (raw['new_path'] as string),
    newPath: raw['new_path'] as string,
    isNew: (raw['new_file'] as boolean) ?? false,
    isDeleted: (raw['deleted_file'] as boolean) ?? false,
    isRenamed: (raw['renamed_file'] as boolean) ?? false,
    isBinary: (raw['diff'] as string)?.includes('Binary files') ?? false,
    addedLines: (raw['added_lines'] as number) ?? 0,
    removedLines: (raw['removed_lines'] as number) ?? 0,
    diffType: 'text'
  }
}

// ---------------------------------------------------------------------------
// Threads & Notes
// ---------------------------------------------------------------------------

function transformNote(raw: Record<string, unknown>): Note {
  return {
    id: raw['id'] as number,
    author: transformAuthor(raw['author'] as Record<string, unknown>),
    body: raw['body'] as string,
    createdAt: raw['created_at'] as string,
    updatedAt: raw['updated_at'] as string,
    resolved: (raw['resolved'] as boolean) ?? false,
    isDraft: false,
    system: (raw['system'] as boolean) ?? false
  }
}

function transformPosition(raw: Record<string, unknown> | null): ThreadPosition | null {
  if (!raw) return null
  return {
    baseSha: raw['base_sha'] as string,
    headSha: raw['head_sha'] as string,
    startSha: raw['start_sha'] as string,
    oldPath: (raw['old_path'] as string) ?? '',
    newPath: (raw['new_path'] as string) ?? '',
    oldLine: (raw['old_line'] as number | null) ?? null,
    newLine: (raw['new_line'] as number | null) ?? null,
    lineType: (raw['line_type'] as ThreadPosition['lineType']) ?? null
  }
}

export function transformThread(
  raw: Record<string, unknown>,
  accountId: string,
  mrIid: number,
  repoId: number
): Thread {
  return {
    id: raw['id'] as string,
    mrIid,
    repoId,
    accountId,
    type: (raw['notes'] as Record<string, unknown>[])[0]?.['type'] as Thread['type'] ?? 'Note',
    resolved: (raw['resolved'] as boolean) ?? false,
    resolvable: (raw['resolvable'] as boolean) ?? false,
    position: transformPosition(
      ((raw['notes'] as Record<string, unknown>[])[0]?.['position'] as Record<string, unknown>) ?? null
    ),
    notes: ((raw['notes'] as unknown[]) ?? []).map((n) =>
      transformNote(n as Record<string, unknown>)
    ),
    createdAt: ((raw['notes'] as Record<string, unknown>[])[0]?.['created_at'] as string) ?? '',
    updatedAt: ((raw['notes'] as Record<string, unknown>[])[0]?.['updated_at'] as string) ?? ''
  }
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export function transformPipeline(
  raw: Record<string, unknown>,
  accountId: string,
  repoId: number,
  repoFullPath: string
): Pipeline {
  return {
    id: raw['id'] as number,
    accountId,
    repoId,
    repoFullPath,
    status: raw['status'] as PipelineStatus,
    ref: raw['ref'] as string,
    sha: raw['sha'] as string,
    source: (raw['source'] as PipelineTrigger) ?? 'push',
    webUrl: raw['web_url'] as string,
    createdAt: raw['created_at'] as string,
    updatedAt: raw['updated_at'] as string,
    startedAt: (raw['started_at'] as string | null) ?? null,
    finishedAt: (raw['finished_at'] as string | null) ?? null,
    duration: (raw['duration'] as number | null) ?? null,
    coverage: (raw['coverage'] as number | null) ?? null,
    mrIid: null
  }
}

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

export function transformJob(
  raw: Record<string, unknown>,
  accountId: string,
  repoId: number,
  pipelineId: number
): Job {
  return {
    id: raw['id'] as number,
    pipelineId,
    accountId,
    repoId,
    name: raw['name'] as string,
    stage: raw['stage'] as string,
    status: raw['status'] as Job['status'],
    webUrl: raw['web_url'] as string,
    createdAt: raw['created_at'] as string,
    startedAt: (raw['started_at'] as string | null) ?? null,
    finishedAt: (raw['finished_at'] as string | null) ?? null,
    duration: (raw['duration'] as number | null) ?? null,
    allowFailure: (raw['allow_failure'] as boolean) ?? false,
    artifacts: ((raw['artifacts'] as unknown[]) ?? []).map((a, idx) => {
      const ar = a as Record<string, unknown>
      return {
        id: idx,
        jobId: raw['id'] as number,
        filename: (ar['filename'] as string) ?? 'artifact',
        size: (ar['size'] as number) ?? 0,
        fileType: (ar['file_type'] as string) ?? 'other',
        fileFormat: (ar['file_format'] as string) ?? 'zip',
        downloadUrl: null
      }
    })
  }
}

// ---------------------------------------------------------------------------
// Test Report
// ---------------------------------------------------------------------------

export function transformTestReport(
  raw: Record<string, unknown>,
  pipelineId: number
): TestReport {
  return {
    pipelineId,
    totalTime: (raw['total_time'] as number) ?? 0,
    totalCount: (raw['total_count'] as number) ?? 0,
    successCount: (raw['success_count'] as number) ?? 0,
    failedCount: (raw['failed_count'] as number) ?? 0,
    skippedCount: (raw['skipped_count'] as number) ?? 0,
    errorCount: (raw['error_count'] as number) ?? 0,
    testSuites: ((raw['test_suites'] as unknown[]) ?? []).map((s) => {
      const suite = s as Record<string, unknown>
      return {
        name: suite['name'] as string,
        totalTime: (suite['total_time'] as number) ?? 0,
        totalCount: (suite['total_count'] as number) ?? 0,
        successCount: (suite['success_count'] as number) ?? 0,
        failedCount: (suite['failed_count'] as number) ?? 0,
        skippedCount: (suite['skipped_count'] as number) ?? 0,
        errorCount: (suite['error_count'] as number) ?? 0,
        testCases: ((suite['test_cases'] as unknown[]) ?? []).map((c) => {
          const tc = c as Record<string, unknown>
          return {
            status: tc['status'] as TestCase['status'],
            name: tc['name'] as string,
            classname: (tc['classname'] as string) ?? '',
            executionTime: (tc['execution_time'] as number) ?? 0,
            systemOutput: (tc['system_output'] as string | null) ?? null,
            stackTrace: (tc['stack_trace'] as string | null) ?? null
          }
        })
      } satisfies TestSuite
    })
  }
}

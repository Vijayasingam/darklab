import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { IPCResult, MergeRequest, DiffFile, FilePair, Thread, Note, MergeStrategy } from '../../shared/types'
import { getRegistry } from '../providers/registry'
import { getStore } from '../services/store'
import type { CreateMRInput, PostCommentInput, SubmitReviewInput, MergeInput, ListMROptions } from '../providers/IGitProvider'

function ok<T>(data: T): IPCResult<T> { return { ok: true, data } }
function fail(error: unknown): IPCResult<never> {
  return { ok: false, error: { code: 'PROVIDER_ERROR', message: error instanceof Error ? error.message : String(error) } }
}
function activeAccountId(): string { return getStore().get('activeAccountId') ?? '' }

export function registerMRHandlers(): void {
  ipcMain.handle(
    IPC.MR.LIST,
    async (_, options: ListMROptions & { accountId?: string }): Promise<IPCResult<MergeRequest[]>> => {
      try {
        const { accountId, ...rest } = options
        const provider = getRegistry().getOrThrow(accountId ?? activeAccountId())
        return ok(await provider.listMergeRequests(rest))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.GET,
    async (_, payload: { repoId: number; mrIid: number; accountId?: string }): Promise<IPCResult<MergeRequest>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        return ok(await provider.getMergeRequest(payload.repoId, payload.mrIid))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.CREATE,
    async (_, input: CreateMRInput & { accountId?: string }): Promise<IPCResult<MergeRequest>> => {
      try {
        const { accountId, ...rest } = input
        const provider = getRegistry().getOrThrow(accountId ?? activeAccountId())
        return ok(await provider.createMergeRequest(rest))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.GET_MERGE_OPTIONS,
    async (_, payload: { repoId: number; mrIid: number; accountId?: string }): Promise<IPCResult<MergeStrategy[]>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        return ok(await provider.getMergeOptions(payload.repoId, payload.mrIid))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.GET_DIFF_FILES,
    async (_, payload: { repoId: number; mrIid: number; accountId?: string }): Promise<IPCResult<DiffFile[]>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        return ok(await provider.getDiffFiles(payload.repoId, payload.mrIid))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.GET_FILE_PAIR,
    async (_, payload: { repoId: number; mrIid: number; filePath: string; accountId?: string }): Promise<IPCResult<FilePair>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        return ok(await provider.getFilePair(payload.repoId, payload.mrIid, payload.filePath))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.GET_THREADS,
    async (_, payload: { repoId: number; mrIid: number; accountId?: string }): Promise<IPCResult<Thread[]>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        return ok(await provider.getThreads(payload.repoId, payload.mrIid))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.POST_COMMENT,
    async (_, input: PostCommentInput & { accountId?: string }): Promise<IPCResult<Note>> => {
      try {
        const { accountId, ...rest } = input
        const provider = getRegistry().getOrThrow(accountId ?? activeAccountId())
        return ok(await provider.postComment(rest))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.POST_DRAFT_NOTE,
    async (_, input: PostCommentInput & { accountId?: string }): Promise<IPCResult<Note>> => {
      try {
        const { accountId, ...rest } = input
        const provider = getRegistry().getOrThrow(accountId ?? activeAccountId())
        return ok(await provider.postDraftNote(rest))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.SUBMIT_REVIEW,
    async (_, input: SubmitReviewInput & { accountId?: string }): Promise<IPCResult<void>> => {
      try {
        const { accountId, ...rest } = input
        const provider = getRegistry().getOrThrow(accountId ?? activeAccountId())
        await provider.submitReview(rest)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.DISCARD_DRAFT_NOTES,
    async (_, payload: { repoId: number; mrIid: number; accountId?: string }): Promise<IPCResult<void>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        await provider.discardDraftNotes(payload.repoId, payload.mrIid)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.RESOLVE_THREAD,
    async (_, payload: { repoId: number; mrIid: number; threadId: string; resolved: boolean; accountId?: string }): Promise<IPCResult<void>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        await provider.resolveThread(payload.repoId, payload.mrIid, payload.threadId, payload.resolved)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.APPROVE,
    async (_, payload: { repoId: number; mrIid: number; accountId?: string }): Promise<IPCResult<void>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        await provider.approveMR(payload.repoId, payload.mrIid)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.UNAPPROVE,
    async (_, payload: { repoId: number; mrIid: number; accountId?: string }): Promise<IPCResult<void>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        await provider.unapproveMR(payload.repoId, payload.mrIid)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.REQUEST_CHANGES,
    async (_, payload: { repoId: number; mrIid: number; body?: string; accountId?: string }): Promise<IPCResult<void>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        await provider.requestChanges(payload.repoId, payload.mrIid, payload.body)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.MERGE,
    async (_, input: MergeInput & { accountId?: string }): Promise<IPCResult<void>> => {
      try {
        const { accountId, ...rest } = input
        const provider = getRegistry().getOrThrow(accountId ?? activeAccountId())
        await provider.mergeMR(rest)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MR.CLOSE,
    async (_, payload: { repoId: number; mrIid: number; accountId?: string }): Promise<IPCResult<void>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        await provider.closeMR(payload.repoId, payload.mrIid)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.MY_WORK.GET,
    async (_, accountId?: string): Promise<IPCResult<unknown>> => {
      try {
        const provider = getRegistry().getOrThrow(accountId ?? activeAccountId())
        return ok(await provider.getMyWork())
      } catch (err) { return fail(err) }
    }
  )
}

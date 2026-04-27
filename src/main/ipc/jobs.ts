import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { IPCResult, Job, Artifact } from '../../shared/types'
import { getRegistry } from '../providers/registry'
import { getStore } from '../services/store'
import { getMainWindow } from '../window'
import { app, dialog } from 'electron'
import { join } from 'path'

function ok<T>(data: T): IPCResult<T> { return { ok: true, data } }
function fail(error: unknown): IPCResult<never> {
  return { ok: false, error: { code: 'PROVIDER_ERROR', message: error instanceof Error ? error.message : String(error) } }
}
function activeAccountId(): string { return getStore().get('activeAccountId') ?? '' }

export function registerJobHandlers(): void {
  ipcMain.handle(
    IPC.JOB.LIST,
    async (_, payload: { repoId: number; pipelineId: number; accountId?: string }): Promise<IPCResult<Job[]>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        return ok(await provider.listJobs(payload.repoId, payload.pipelineId))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.JOB.GET,
    async (_, payload: { repoId: number; jobId: number; accountId?: string }): Promise<IPCResult<Job>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        return ok(await provider.getJob(payload.repoId, payload.jobId))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.JOB.RETRY,
    async (_, payload: { repoId: number; jobId: number; accountId?: string }): Promise<IPCResult<Job>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        return ok(await provider.retryJob(payload.repoId, payload.jobId))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.JOB.CANCEL,
    async (_, payload: { repoId: number; jobId: number; accountId?: string }): Promise<IPCResult<Job>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        return ok(await provider.cancelJob(payload.repoId, payload.jobId))
      } catch (err) { return fail(err) }
    }
  )

  // Start streaming job log — pushes chunks to renderer via IPC
  ipcMain.handle(
    IPC.JOB.STREAM_LOG,
    async (_, payload: { repoId: number; jobId: number; accountId?: string }): Promise<IPCResult<void>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        const win = getMainWindow()

        await provider.streamJobLog(
          payload.repoId,
          payload.jobId,
          (chunk) => {
            win?.webContents.send(IPC.JOB.LOG_CHUNK, { jobId: payload.jobId, chunk })
          },
          () => {
            win?.webContents.send(IPC.JOB.LOG_DONE, { jobId: payload.jobId })
          }
        )

        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.JOB.LIST_ARTIFACTS,
    async (_, payload: { repoId: number; jobId: number; accountId?: string }): Promise<IPCResult<Artifact[]>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        return ok(await provider.listArtifacts(payload.repoId, payload.jobId))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.JOB.DOWNLOAD_ARTIFACT,
    async (_, payload: {
      repoId: number
      jobId: number
      artifactId: number
      filename: string
      accountId?: string
    }): Promise<IPCResult<void>> => {
      try {
        const win = getMainWindow()
        const { filePath, canceled } = await dialog.showSaveDialog(win!, {
          defaultPath: join(app.getPath('downloads'), payload.filename)
        })

        if (canceled || !filePath) return ok(undefined)

        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        await provider.downloadArtifact(
          payload.repoId,
          payload.jobId,
          payload.artifactId,
          filePath,
          (percent) => {
            win?.webContents.send(IPC.JOB.ARTIFACT_PROGRESS, { jobId: payload.jobId, artifactId: payload.artifactId, percent })
          }
        )

        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )
}

import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { IPCResult, Pipeline, Stage, TestReport } from '../../shared/types'
import { getRegistry } from '../providers/registry'
import { getStore } from '../services/store'
import type { ListPipelineOptions, TriggerPipelineInput } from '../providers/IGitProvider'

function ok<T>(data: T): IPCResult<T> { return { ok: true, data } }
function fail(error: unknown): IPCResult<never> {
  return { ok: false, error: { code: 'PROVIDER_ERROR', message: error instanceof Error ? error.message : String(error) } }
}
function activeAccountId(): string { return getStore().get('activeAccountId') ?? '' }

export function registerPipelineHandlers(): void {
  ipcMain.handle(
    IPC.PIPELINE.LIST,
    async (_, options: ListPipelineOptions & { accountId?: string }): Promise<IPCResult<Pipeline[]>> => {
      try {
        const { accountId, ...rest } = options
        const provider = getRegistry().getOrThrow(accountId ?? activeAccountId())
        return ok(await provider.listPipelines(rest))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.PIPELINE.GET,
    async (_, payload: { repoId: number; pipelineId: number; accountId?: string }): Promise<IPCResult<Pipeline>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        return ok(await provider.getPipeline(payload.repoId, payload.pipelineId))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.PIPELINE.GET_STAGES,
    async (_, payload: { repoId: number; pipelineId: number; accountId?: string }): Promise<IPCResult<Stage[]>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        return ok(await provider.getPipelineStages(payload.repoId, payload.pipelineId))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.PIPELINE.TRIGGER,
    async (_, input: TriggerPipelineInput & { accountId?: string }): Promise<IPCResult<Pipeline>> => {
      try {
        const { accountId, ...rest } = input
        const provider = getRegistry().getOrThrow(accountId ?? activeAccountId())
        return ok(await provider.triggerPipeline(rest))
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.PIPELINE.CANCEL,
    async (_, payload: { repoId: number; pipelineId: number; accountId?: string }): Promise<IPCResult<void>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        await provider.cancelPipeline(payload.repoId, payload.pipelineId)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.PIPELINE.RETRY,
    async (_, payload: { repoId: number; pipelineId: number; accountId?: string }): Promise<IPCResult<void>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        await provider.retryPipeline(payload.repoId, payload.pipelineId)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.PIPELINE.GET_TEST_REPORT,
    async (_, payload: { repoId: number; pipelineId: number; accountId?: string }): Promise<IPCResult<TestReport | null>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        return ok(await provider.getTestReport(payload.repoId, payload.pipelineId))
      } catch (err) { return fail(err) }
    }
  )
}

import { create } from 'zustand'
import { DraftComment } from '@shared/types'

interface DraftsState {
  // keyed by `${repoId}:${mrIid}`
  drafts: Record<string, DraftComment[]>
  addDraft: (repoId: number, mrIid: number, draft: DraftComment) => void
  removeDraft: (repoId: number, mrIid: number, draftId: string) => void
  clearDrafts: (repoId: number, mrIid: number) => void
}

function key(repoId: number, mrIid: number): string {
  return `${repoId}:${mrIid}`
}

export const useDraftsStore = create<DraftsState>((set) => ({
  drafts: {},

  addDraft(repoId, mrIid, draft) {
    set((state) => {
      const k = key(repoId, mrIid)
      return { drafts: { ...state.drafts, [k]: [...(state.drafts[k] ?? []), draft] } }
    })
  },

  removeDraft(repoId, mrIid, draftId) {
    set((state) => {
      const k = key(repoId, mrIid)
      return {
        drafts: {
          ...state.drafts,
          [k]: (state.drafts[k] ?? []).filter((d) => d.id !== draftId)
        }
      }
    })
  },

  clearDrafts(repoId, mrIid) {
    set((state) => {
      const { [key(repoId, mrIid)]: _, ...rest } = state.drafts
      return { drafts: rest }
    })
  }
}))

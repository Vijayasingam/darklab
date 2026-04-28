import { TypographyP, TypographySpan } from '../ui/typography'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Thread, Note } from '@shared/types'
import { invoke } from '../../lib/ipc'
import { IPC } from '@shared/ipc-channels'
import { cn, formatRelativeTime } from '../../lib/utils'
import { CheckCircle2, ChevronDown, ChevronRight, MessageSquare, Send } from 'lucide-react'

interface ThreadListProps {
  threads: Thread[]
  repoId: number
  mrIid: number
}

export function ThreadList({ threads, repoId, mrIid }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-600">
        <MessageSquare size={24} className="mb-2 opacity-40" />
        <TypographyP className="text-sm">No threads yet</TypographyP>
      </div>
    )
  }

  // Separate resolvable from non-resolvable
  const resolvable = threads.filter((t) => t.resolvable)
  const general = threads.filter((t) => !t.resolvable)

  return (
    <div className="space-y-3">
      {resolvable.length > 0 && (
        <div>
          <TypographyP className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Code threads ({resolvable.filter((t) => !t.resolved).length} unresolved)
          </TypographyP>
          <div className="space-y-2">
            {resolvable.map((t) => (
              <ThreadItem key={t.id} thread={t} repoId={repoId} mrIid={mrIid} />
            ))}
          </div>
        </div>
      )}
      {general.length > 0 && (
        <div>
          <TypographyP className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            General comments
          </TypographyP>
          <div className="space-y-2">
            {general.map((t) => (
              <ThreadItem key={t.id} thread={t} repoId={repoId} mrIid={mrIid} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ThreadItem({ thread, repoId, mrIid }: { thread: Thread; repoId: number; mrIid: number }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(!thread.resolved)
  const [replyText, setReplyText] = useState('')
  const [showReply, setShowReply] = useState(false)

  const resolveMutation = useMutation({
    mutationFn: (resolved: boolean) =>
      invoke<void>(IPC.MR.RESOLVE_THREAD, { repoId, mrIid, threadId: thread.id, resolved }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mr-threads'] })
  })

  const replyMutation = useMutation({
    mutationFn: () =>
      invoke<Note>(IPC.MR.POST_COMMENT, { repoId, mrIid, body: replyText }),
    onSuccess: () => {
      setReplyText('')
      setShowReply(false)
      qc.invalidateQueries({ queryKey: ['mr-threads'] })
    }
  })

  const firstNote = thread.notes[0]

  return (
    <div
      className={cn(
        'rounded-lg border',
        thread.resolved ? 'border-white/5 opacity-60' : 'border-white/10'
      )}
    >
      {/* Thread header */}
      <Button
        onClick={() => setExpanded((v) => !v)}
        variant="ghost"
        className="flex h-auto w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        {expanded ? <ChevronDown size={13} className="text-neutral-500" /> : <ChevronRight size={13} className="text-neutral-500" />}
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-neutral-300">
          {firstNote?.author?.name?.[0] ?? '?'}
        </div>
        <TypographySpan className="flex-1 truncate text-sm text-neutral-300">
          {firstNote?.author?.name} · {firstNote && formatRelativeTime(firstNote.createdAt)}
        </TypographySpan>
        {thread.position && (
          <TypographySpan className="text-xs text-neutral-600 font-mono">
            {thread.position.newPath?.split('/').pop()}:{thread.position.newLine}
          </TypographySpan>
        )}
        {thread.resolved && (
          <CheckCircle2 size={14} className="text-status-success" />
        )}
      </Button>

      {expanded && (
        <div className="border-t border-white/5 px-3 pb-3">
          {thread.notes.map((note) => (
            <NoteItem key={note.id} note={note} />
          ))}

          {/* Thread actions */}
          {thread.resolvable && (
            <div className="mt-2 flex items-center gap-2">
              <Button
                onClick={() => setShowReply((v) => !v)}
                variant="link"
                className="h-auto p-0 text-xs text-neutral-500 hover:text-neutral-300"
              >
                Reply
              </Button>
              <Button
                onClick={() => resolveMutation.mutate(!thread.resolved)}
                disabled={resolveMutation.isPending}
                variant="link"
                className={cn(
                  'ml-auto h-auto p-0 text-xs transition-colors',
                  thread.resolved
                    ? 'text-neutral-500 hover:text-neutral-300'
                    : 'text-status-success hover:text-status-success/80'
                )}
              >
                {thread.resolved ? 'Unresolve' : 'Resolve thread'}
              </Button>
            </div>
          )}

          {showReply && (
            <div className="mt-2 flex items-end gap-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Leave a comment…"
                rows={2}
                className="flex-1 resize-none bg-white/5 text-sm text-neutral-200 placeholder-neutral-600"
              />
              <Button
                onClick={() => replyMutation.mutate()}
                disabled={!replyText.trim() || replyMutation.isPending}
                size="icon"
                className="flex-shrink-0 p-2"
              >
                <Send size={14} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NoteItem({ note }: { note: Note }) {
  return (
    <div className="mt-2.5 flex gap-2">
      <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-neutral-300">
        {note.author?.name?.[0] ?? '?'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <TypographySpan className="text-xs font-medium text-neutral-300">{note.author?.name}</TypographySpan>
          <TypographySpan className="text-xs text-neutral-600">{formatRelativeTime(note.createdAt)}</TypographySpan>
          {note.isDraft && (
            <TypographySpan className="rounded bg-white/5 px-1 py-0.5 text-xs text-neutral-500">Draft</TypographySpan>
          )}
        </div>
        <TypographyP className="mt-0.5 text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap">{note.body}</TypographyP>
      </div>
    </div>
  )
}

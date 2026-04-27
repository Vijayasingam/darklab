import { useQuery } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { DiffFile, FilePair, Thread } from '@shared/types'
import { invoke } from '../../lib/ipc'
import { useAccountStore } from '../../store/account'
import { Loader2 } from 'lucide-react'
import { DiffEditor } from '@monaco-editor/react'

interface DiffViewerProps {
  repoId: number
  mrIid: number
  file: DiffFile
  threads: Thread[]
}

export function DiffViewer({ repoId, mrIid, file, threads: _threads }: DiffViewerProps) {
  const accountId = useAccountStore((s) => s.activeAccountId)

  const { data: pair, isLoading } = useQuery<FilePair>({
    queryKey: ['file-pair', accountId, repoId, mrIid, file.newPath],
    queryFn: () =>
      invoke<FilePair>(IPC.MR.GET_FILE_PAIR, {
        repoId,
        mrIid,
        filePath: file.newPath
      }),
    enabled: !!accountId
  })

  if (isLoading || !pair) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-600">
        <Loader2 size={16} className="animate-spin" />
      </div>
    )
  }

  if (file.isBinary) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-600">
        Binary file — diff not available
      </div>
    )
  }

  return (
    <div className="h-full overflow-hidden">
      <DiffEditor
        height="100%"
        language={pair.language}
        original={pair.original}
        modified={pair.modified}
        theme="vs-dark"
        options={{
          readOnly: true,
          fontSize: 13,
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
          lineNumbers: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6
          }
        }}
      />
    </div>
  )
}

import { useRef } from 'react'
import { useTabsStore } from '../../store/tabs'
import { cn } from '../../lib/utils'
import { X, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { AppTab } from '@shared/types'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableTab({ tab, isActive }: { tab: AppTab; isActive: boolean }): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id })
  const closeTab = useTabsStore((s) => s.closeTab)
  const setActiveTab = useTabsStore((s) => s.setActiveTab)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative flex min-w-0 max-w-[200px] flex-shrink-0 cursor-default select-none items-center gap-1.5 border-r border-white/5 px-3 py-1.5 text-sm transition-colors',
        isActive
          ? 'bg-base-800 text-neutral-100'
          : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-300',
        isDragging && 'opacity-50'
      )}
      onClick={() => setActiveTab(tab.id)}
    >
      <span className="truncate">{tab.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          closeTab(tab.id)
        }}
        className={cn(
          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded transition-colors',
          'opacity-0 group-hover:opacity-100',
          isActive && 'opacity-60',
          'hover:bg-white/10 hover:!opacity-100'
        )}
      >
        <X size={10} />
      </button>

      {/* Active indicator */}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent-500" />
      )}
    </div>
  )
}

export function TabBar(): JSX.Element {
  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const reorderTabs = useTabsStore((s) => s.reorderTabs)
  const openTab = useTabsStore((s) => s.openTab)
  const scrollRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id)
      const newIndex = tabs.findIndex((t) => t.id === over.id)
      reorderTabs(oldIndex, newIndex)
    }
  }

  function scroll(dir: 'left' | 'right'): void {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -120 : 120, behavior: 'smooth' })
  }

  return (
    <div className="drag-region flex h-9 flex-shrink-0 items-stretch border-b border-white/5 bg-base-950">
      {/* macOS traffic light space */}
      <div className="w-[70px] flex-shrink-0" />

      {/* Scroll left */}
      <button
        onClick={() => scroll('left')}
        className="no-drag flex-shrink-0 px-1 text-neutral-600 hover:text-neutral-300"
      >
        <ChevronLeft size={12} />
      </button>

      {/* Tab list */}
      <div
        ref={scrollRef}
        className="no-drag flex flex-1 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
            {tabs.map((tab) => (
              <SortableTab key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Scroll right */}
      <button
        onClick={() => scroll('right')}
        className="no-drag flex-shrink-0 px-1 text-neutral-600 hover:text-neutral-300"
      >
        <ChevronRight size={12} />
      </button>

      {/* New tab button */}
      <button
        onClick={() =>
          openTab(
            { type: 'home' as never, title: 'My Work', icon: '', route: '/my-work', routeState: {} },
            { newTab: true }
          )
        }
        className="no-drag flex-shrink-0 px-2 text-neutral-600 hover:text-neutral-300"
        title="New tab"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

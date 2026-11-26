import { TypographySpan } from '../ui/typography'
import { Button } from '../ui/button'
import { useRef } from 'react'
import { useTabsStore } from '../../store/tabs'
import { cn } from '../../lib/utils'
import { X, Plus, CaretLeft, CaretRight } from '@phosphor-icons/react'
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
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableTab({ tab, isActive }: { tab: AppTab; isActive: boolean }) {
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
        'group relative flex min-w-0 max-w-[200px] flex-shrink-0 cursor-default select-none items-center gap-1.5 border-r border-border/50 px-3 py-1.5 text-sm transition-colors',
        isActive
          ? 'bg-popover text-foreground'
          : 'text-muted-foreground/70 hover:bg-muted/50 hover:text-foreground',
        isDragging && 'opacity-50'
      )}
      onClick={() => setActiveTab(tab.id)}
    >
      <TypographySpan className="truncate">{tab.title}</TypographySpan>
      <Button
        onClick={(e) => {
          e.stopPropagation()
          closeTab(tab.id)
        }}
        variant="ghost"
        size="icon"
        className={cn(
          'h-4 w-4 flex-shrink-0 transition-colors',
          'opacity-0 group-hover:opacity-100',
          isActive && 'opacity-60',
          'hover:bg-muted hover:!opacity-100'
        )}
      >
        <X size={10} />
      </Button>

      {/* Active indicator */}
      {isActive && (
        <TypographySpan className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
      )}
    </div>
  )
}

export function TabBar() {
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
    <div className="drag-region flex h-9 flex-shrink-0 items-stretch border-b border-border/50 bg-background">
      {/* macOS traffic light space */}
      <div className="w-[70px] flex-shrink-0" />

      {/* Scroll left */}
      <Button
        onClick={() => scroll('left')}
        variant="ghost"
        size="icon"
        className="no-drag h-9 w-7 flex-shrink-0 px-1 text-muted-foreground hover:text-foreground"
      >
        <CaretLeft size={12} />
      </Button>

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
      <Button
        onClick={() => scroll('right')}
        variant="ghost"
        size="icon"
        className="no-drag h-9 w-7 flex-shrink-0 px-1 text-muted-foreground hover:text-foreground"
      >
        <CaretRight size={12} />
      </Button>

      {/* New tab button */}
      <Button
        onClick={() =>
          openTab(
            { type: 'home' as never, title: 'My Work', icon: '', route: '/my-work', routeState: {} },
            { newTab: true }
          )
        }
        variant="ghost"
        size="icon"
        className="no-drag h-9 w-8 flex-shrink-0 px-2 text-muted-foreground hover:text-foreground"
        title="New tab"
      >
        <Plus size={14} />
      </Button>
    </div>
  )
}

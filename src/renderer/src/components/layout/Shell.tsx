import { IconRail } from './IconRail'
import { TabBar } from './TabBar'
import { TabContent } from './TabContent'

export function Shell() {
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left icon rail */}
      <IconRail />

      {/* Main area: tab bar + content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TabBar />
        <TabContent />
      </div>
    </div>
  )
}

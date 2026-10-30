import { Outlet } from 'react-router'

export function ViewerLayout() {
  return <div className="h-dvh min-h-[320px] overflow-hidden bg-ops-bg text-ops-text"><Outlet /></div>
}

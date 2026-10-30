import { useEffect } from 'react'
import { useAppStore } from '../stores/app-store'

export function useSimulationRuntime() {
  const running = useAppStore((state) => state.data?.simulation.running ?? false)
  const speed = useAppStore((state) => state.data?.simulation.speed ?? 1)
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => { void useAppStore.getState().advanceSimulation() }, 1000 / speed)
    return () => window.clearInterval(timer)
  }, [running, speed])
}

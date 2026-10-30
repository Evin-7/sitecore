import { useEffect, useMemo, useState } from 'react'
import { ALERTS, BASE_ASSETS, SIMULATION_CYCLES } from '../data/site-data'

const UPDATE_INTERVAL_MS = 16_000

export function useOperationsSimulation() {
  const [cycleIndex, setCycleIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCycleIndex((current) => (current + 1) % SIMULATION_CYCLES.length)
    }, UPDATE_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [])

  const cycle = SIMULATION_CYCLES[cycleIndex]
  const assets = useMemo(
    () => BASE_ASSETS.map((asset) => ({ ...asset, status: cycle.overrides[asset.id] ?? asset.status })),
    [cycle],
  )
  const alerts = useMemo(
    () => ALERTS.filter((alert) => alert.cycles.includes(cycleIndex)),
    [cycleIndex],
  )

  return { assets, alerts, cycle, cycleIndex, cycleCount: SIMULATION_CYCLES.length }
}

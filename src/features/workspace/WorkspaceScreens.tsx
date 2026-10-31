import { useState } from 'react'
import { ArrowRight, Cloud, Database } from 'lucide-react'
import { Button, Card } from '../../components/ui'

export function CloudSetupScreen() {
  return <div className="grid min-h-dvh place-items-center bg-ops-bg p-4 sm:p-6">
    <Card className="w-full max-w-xl p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-ops-accent-bg text-ops-accent-text"><Cloud size={21}/></span><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-ops-accent-text">SiteCore cloud</p><h1 className="mt-1 text-xl font-semibold">Connect the shared workspace</h1></div></div>
      <p className="text-sm leading-6 text-ops-muted">Add your Supabase project URL and publishable key to the local environment and Vercel. Everyone who visits SiteCore will see and be able to edit the same shared demo records.</p>
      <div className="mt-5 rounded-lg border border-ops-line bg-ops-bg p-4 font-mono text-xs leading-6 text-ops-muted">
        <p>VITE_SUPABASE_URL=https://your-project.supabase.co</p>
        <p>VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…</p>
      </div>
      <p className="mt-4 text-xs leading-5 text-ops-muted">Use demo data only: any visitor can update the shared workspace. Never add a Supabase secret or service-role key to a <code>VITE_</code> variable. See <code>.env.example</code> and the README for setup.</p>
    </Card>
  </div>
}

export function SharedDataMigrationScreen({
  hasSharedData,
  onPublish,
  onUseShared,
}: {
  hasSharedData: boolean
  onPublish: () => Promise<void>
  onUseShared: () => Promise<void>
}) {
  const [pendingChoice, setPendingChoice] = useState<'publish' | 'shared' | null>(null)
  const runChoice = async (choice: 'publish' | 'shared', action: () => Promise<void>) => {
    if (pendingChoice) return
    setPendingChoice(choice)
    try { await action() } finally { setPendingChoice(null) }
  }

  return <div className="grid min-h-dvh place-items-center bg-ops-bg p-4 sm:p-6">
    <Card className="w-full max-w-lg p-6 sm:p-8">
      <span className="grid size-11 place-items-center rounded-xl bg-ops-accent-bg text-ops-accent-text"><Database size={20}/></span>
      <h1 className="mt-5 text-xl font-semibold">{hasSharedData ? 'Publish this browser’s saved data?' : 'Start the shared workspace?'}</h1>
      <p className="mt-2 text-sm leading-6 text-ops-muted">
        {hasSharedData
          ? 'This browser has records saved from the previous local version. Publishing them replaces the shared records every visitor sees. Choose “Use shared data” to keep the current public workspace.'
          : 'This browser has records saved from the previous local version. Publishing them will initialize the shared workspace for every visitor. You can also start with the sample site.'}
      </p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button variant="primary" onClick={() => runChoice('publish', onPublish)} loading={pendingChoice === 'publish'} disabled={Boolean(pendingChoice)}>Publish to everyone</Button>
        <Button onClick={() => runChoice('shared', onUseShared)} loading={pendingChoice === 'shared'} disabled={Boolean(pendingChoice)}>{hasSharedData ? 'Use shared data' : 'Use sample site'} <ArrowRight size={15}/></Button>
      </div>
      <p className="mt-4 text-xs leading-5 text-ops-muted">All edits are public and sync to other open browsers. This demo workspace is not suitable for confidential or operational records.</p>
    </Card>
  </div>
}

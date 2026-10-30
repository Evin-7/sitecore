import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppShell } from '../components/layout/AppShell'
import { createInitialData } from '../data/site-data'
import { AssetsPage } from '../features/assets/AssetsPage'
import { useAppStore } from '../stores/app-store'

describe('workspace navigation', () => {
  beforeEach(() => useAppStore.setState({ data: createInitialData(), hydrated: true, error: null }))

  it('navigates from the overview to the asset register using the shared sidebar', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter([{
      path: '/', element: <AppShell />, children: [
        { index: true, element: <p>Overview test view</p> },
        { path: 'assets', element: <p>Asset register test view</p> },
      ],
    }])
    render(<RouterProvider router={router} />)
    expect(screen.getByText('Overview test view')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Asset register/ }))
    expect(await screen.findByText('Asset register test view')).toBeInTheDocument()
  })

  it('opens the requested asset editor when returning from the site inspector', async () => {
    const router = createMemoryRouter([{
      path: '/', element: <AppShell />, children: [
        { path: 'assets', element: <AssetsPage /> },
      ],
    }], { initialEntries: [{ pathname: '/assets', state: { editAssetId: 'STG-04' } }] })
    render(<RouterProvider router={router} />)
    expect(await screen.findByRole('dialog', { name: 'Edit STG-04' })).toBeInTheDocument()
    expect(screen.getByLabelText('Asset name')).toHaveValue('Chemical store')
  })
})

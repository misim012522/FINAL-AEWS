import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import AdminStudentsAtRisk from './AdminStudentsAtRisk'

vi.mock('../../api', () => ({
  getAdminStudentsAtRisk: vi.fn(),
}))

const { getAdminStudentsAtRisk } = await import('../../api')

function renderComponent(props = {}) {
  return render(
    <MemoryRouter>
      <AdminStudentsAtRisk {...props} />
    </MemoryRouter>
  )
}

describe('AdminStudentsAtRisk', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows only the first three students from the API result', async () => {
    getAdminStudentsAtRisk.mockResolvedValue([
      { id: '1', student_email: 'a@example.com', department: 'IT', course: 'Course A', risk: 'High', instructor: 'Inst 1', class_id: 'c1' },
      { id: '2', student_email: 'b@example.com', department: 'IT', course: 'Course B', risk: 'Medium', instructor: 'Inst 1', class_id: 'c2' },
      { id: '3', student_email: 'c@example.com', department: 'IT', course: 'Course C', risk: 'High', instructor: 'Inst 2', class_id: 'c3' },
      { id: '4', student_email: 'd@example.com', department: 'IT', course: 'Course D', risk: 'High', instructor: 'Inst 2', class_id: 'c4' },
    ])

    renderComponent()

    await waitFor(() => {
      expect(screen.getAllByText('a@example.com').length).toBeGreaterThan(0)
      expect(screen.getAllByText('b@example.com').length).toBeGreaterThan(0)
      expect(screen.getAllByText('c@example.com').length).toBeGreaterThan(0)
    })

    expect(screen.queryAllByText('d@example.com')).toHaveLength(0)
    expect(screen.getByText('Showing 3 recent students only.')).toBeInTheDocument()
  })

  it('shows an empty state when there are no at-risk students', async () => {
    getAdminStudentsAtRisk.mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('No at-risk students in this filter.')).toBeInTheDocument()
    })
  })
})

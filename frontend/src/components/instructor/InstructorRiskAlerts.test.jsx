import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import InstructorRiskAlerts from './InstructorRiskAlerts'
import { AuthContext } from '../../context/AuthContext'

vi.mock('../../api', () => ({
  getInstructorRiskAlerts: vi.fn(),
  listClasses: vi.fn(),
}))

const { getInstructorRiskAlerts, listClasses } = await import('../../api')

function renderWithAuth(ui) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: { id: 'inst-1', name: 'Instructor' }, role: 'instructor', isAuthenticated: true }}>
        {ui}
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('InstructorRiskAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders risk alerts from the API', async () => {
    getInstructorRiskAlerts.mockResolvedValue([
      { class_id: 'class-1', student_id: '2201103564', student_name: 'Donna Igar', subject_code: 'T40', subject_name: 'Animation', risk: 'High' },
    ])
    listClasses.mockResolvedValue([{ id: 'class-1', subject_code: 'T40', subject_name: 'Animation' }])

    renderWithAuth(<InstructorRiskAlerts />)

    await waitFor(() => {
      expect(screen.getByText('Donna Igar')).toBeInTheDocument()
      expect(screen.getByText(/Student No:/)).toBeInTheDocument()
      expect(screen.getAllByText('High').length).toBeGreaterThan(0)
    })
  })

  it('renders the empty state when no alerts are returned', async () => {
    getInstructorRiskAlerts.mockResolvedValue([])
    listClasses.mockResolvedValue([])

    renderWithAuth(<InstructorRiskAlerts />)

    await waitFor(() => {
      expect(screen.getByText('No risk alerts right now')).toBeInTheDocument()
    })
  })
})

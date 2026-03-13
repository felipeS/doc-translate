import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Glossary from '../app/glossary/page'

describe('Glossary Page', () => {
  let mockFetch: jest.Mock

  beforeEach(() => {
    mockFetch = jest.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders glossary page', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<Glossary />)
    
    await waitFor(() => {
      expect(screen.getByText('Glossary')).toBeInTheDocument()
    })
  })

  it('shows empty state when no terms', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<Glossary />)
    
    await waitFor(() => {
      expect(screen.getByText('No glossary terms yet')).toBeInTheDocument()
    })
  })

  it('shows add term form', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<Glossary />)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g., Mesa')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('e.g., Table')).toBeInTheDocument()
    })
  })

  it('displays terms when they exist', async () => {
    const terms = [
      { id: '1', source: 'Mesa', target: 'Table' },
      { id: '2', source: 'Casa', target: 'House' },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(terms),
    })

    render(<Glossary />)
    
    await waitFor(() => {
      expect(screen.getByText('Mesa')).toBeInTheDocument()
      expect(screen.getByText('Table')).toBeInTheDocument()
      expect(screen.getByText('Casa')).toBeInTheDocument()
      expect(screen.getByText('House')).toBeInTheDocument()
    })
  })

  it('filters terms based on search', async () => {
    const terms = [
      { id: '1', source: 'Mesa', target: 'Table' },
      { id: '2', source: 'Casa', target: 'House' },
      { id: '3', source: 'Perro', target: 'Dog' },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(terms),
    })

    render(<Glossary />)
    
    await waitFor(() => {
      expect(screen.getByText('Mesa')).toBeInTheDocument()
      expect(screen.getByText('Casa')).toBeInTheDocument()
      expect(screen.getByText('Perro')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search terms...')
    fireEvent.change(searchInput, { target: { value: 'Mesa' } })

    await waitFor(() => {
      expect(screen.getByText('Mesa')).toBeInTheDocument()
    })

    // Casa and Perro should be hidden
    const casaElements = screen.queryAllByText('Casa')
    expect(casaElements).toHaveLength(0)
  })

  it('shows correct count of terms', async () => {
    const terms = [
      { id: '1', source: 'Mesa', target: 'Table' },
      { id: '2', source: 'Casa', target: 'House' },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(terms),
    })

    render(<Glossary />)
    
    await waitFor(() => {
      expect(screen.getByText('2 terms')).toBeInTheDocument()
    })
  })

  it('validates required fields when adding term', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<Glossary />)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g., Mesa')).toBeInTheDocument()
    })

    // Try to add with empty fields - button should be disabled
    const addButton = screen.getByText('Add')
    expect(addButton).toBeDisabled()
  })
})

'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, BookOpen } from 'lucide-react'

interface GlossaryTerm {
  id: string
  source: string
  target: string
}

export default function Glossary() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [newSource, setNewSource] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchTerms()
  }, [])

  const fetchTerms = async () => {
    try {
      const response = await fetch('/api/glossary')
      const data = await response.json()
      setTerms(data)
    } catch (error) {
      console.error('Failed to fetch terms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSource.trim() || !newTarget.trim()) return

    setAdding(true)
    try {
      const response = await fetch('/api/glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: newSource, target: newTarget }),
      })

      if (response.ok) {
        setNewSource('')
        setNewTarget('')
        fetchTerms()
      }
    } catch (error) {
      console.error('Failed to add term:', error)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/glossary?id=${id}`, { method: 'DELETE' })
      setTerms(terms.filter(t => t.id !== id))
    } catch (error) {
      console.error('Failed to delete term:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Glossary</h1>
        <p className="mt-2 text-gray-600">Manage your custom translation terms</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleAdd} className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="source" className="block text-sm font-medium text-gray-700">
              Source Term
            </label>
            <input
              type="text"
              id="source"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="e.g., Mesa"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="target" className="block text-sm font-medium text-gray-700">
              Target Translation
            </label>
            <input
              type="text"
              id="target"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              placeholder="e.g., Table"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !newSource.trim() || !newTarget.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Translation
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {terms.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  <BookOpen className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                  <p>No glossary terms yet. Add your first term above.</p>
                </td>
              </tr>
            ) : (
              terms.map((term) => (
                <tr key={term.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {term.source}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {term.target}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(term.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

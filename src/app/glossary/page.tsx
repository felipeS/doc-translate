'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Loader2, BookOpen, Search, Edit2 } from 'lucide-react'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSource, setEditSource] = useState('')
  const [editTarget, setEditTarget] = useState('')

  const fetchTerms = useCallback(async () => {
    try {
      const response = await fetch('/api/glossary')
      const data = await response.json()
      setTerms(data)
    } catch (error) {
      console.error('Failed to fetch terms:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTerms()
  }, [fetchTerms])

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

  const startEdit = (term: GlossaryTerm) => {
    setEditingId(term.id)
    setEditSource(term.source)
    setEditTarget(term.target)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditSource('')
    setEditTarget('')
  }

  const saveEdit = async (id: string) => {
    if (!editSource.trim() || !editTarget.trim()) return
    
    try {
      // Delete old and create new (simple approach)
      await handleDelete(id)
      const response = await fetch('/api/glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: editSource, target: editTarget }),
      })
      if (response.ok) {
        fetchTerms()
      }
    } catch (error) {
      console.error('Failed to update term:', error)
    } finally {
      cancelEdit()
    }
  }

  const filteredTerms = terms.filter(
    (term) =>
      term.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.target.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Glossary</h1>
        <p className="text-zinc-400">Define custom translations for consistent terminology</p>
      </div>

      {/* Add term form */}
      <div className="card animate-fade-in stagger-1">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-violet-400" />
          Add New Term
        </h2>
        <form onSubmit={handleAdd} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Source Term
            </label>
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="e.g., Mesa"
              className="input-field"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Translation
            </label>
            <input
              type="text"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              placeholder="e.g., Table"
              className="input-field"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !newSource.trim() || !newTarget.trim()}
            className="btn-primary px-6 h-[50px] flex items-center gap-2"
          >
            {adding ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Add
              </>
            )}
          </button>
        </form>
      </div>

      {/* Search */}
      {terms.length > 0 && (
        <div className="relative animate-fade-in stagger-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search terms..."
            className="input-field pl-12"
          />
        </div>
      )}

      {/* Terms list */}
      <div className="card p-0 overflow-hidden animate-fade-in stagger-3">
        {filteredTerms.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-400 mb-2">
              {searchQuery ? 'No matching terms found' : 'No glossary terms yet'}
            </p>
            <p className="text-zinc-600 text-sm">
              {searchQuery ? 'Try a different search' : 'Add your first term above'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {filteredTerms.map((term) => (
              <div
                key={term.id}
                className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
              >
                {editingId === term.id ? (
                  <div className="flex-1 flex gap-4 items-center">
                    <input
                      type="text"
                      value={editSource}
                      onChange={(e) => setEditSource(e.target.value)}
                      className="input-field flex-1"
                      autoFocus
                    />
                    <span className="text-zinc-500">→</span>
                    <input
                      type="text"
                      value={editTarget}
                      onChange={(e) => setEditTarget(e.target.value)}
                      className="input-field flex-1"
                    />
                    <button
                      onClick={() => saveEdit(term.id)}
                      className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-6 flex-1 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 text-sm font-mono">
                          {term.source.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium truncate">{term.source}</span>
                      </div>
                      <span className="text-zinc-500">→</span>
                      <span className="text-zinc-400 truncate">{term.target}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => startEdit(term)}
                        className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(term.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {terms.length > 0 && (
        <div className="text-center text-sm text-zinc-500 animate-fade-in">
          {filteredTerms.length} {filteredTerms.length === 1 ? 'term' : 'terms'}
          {searchQuery && ` (filtered from ${terms.length} total)`}
        </div>
      )}
    </div>
  )
}

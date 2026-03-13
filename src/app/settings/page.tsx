'use client'

import { useState, useEffect } from 'react'
import { Key, Save, Loader2, CheckCircle } from 'lucide-react'

export default function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasKey, setHasKey] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setHasKey(!!data.apiKey)
        setApiKey(data.apiKey || '')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })

      if (response.ok) {
        setSaved(true)
        setHasKey(!!apiKey)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
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
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Configure your Gemini API key for translation</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-medium text-gray-900">API Configuration</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
              Gemini API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? '••••••••••••••••' : 'Enter your API key'}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Get your API key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-500"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="-ml-1 mr-2 h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="-ml-1 mr-2 h-4 w-4" />
                Save API Key
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800">About API Keys</h3>
        <p className="mt-1 text-sm text-blue-700">
          Your API key is stored locally in the SQLite database and never leaves this server.
          The key is only used when translating documents.
        </p>
      </div>
    </div>
  )
}

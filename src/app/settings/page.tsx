'use client'

import { useState, useEffect } from 'react'
import { Key, ExternalLink, Shield, AlertCircle, CheckCircle } from 'lucide-react'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [hasKey, setHasKey] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setHasKey(!!data.apiKey)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-zinc-400">Configure your translation engine</p>
      </div>

      {/* API Key Card */}
      <div className="card animate-fade-in stagger-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Gemini API Key</h2>
            <p className="text-sm text-zinc-500">Set as environment variable</p>
          </div>
          {hasKey && (
            <div className="ml-auto flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Configured</span>
            </div>
          )}
        </div>

        <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <p className="text-sm text-zinc-300 mb-3">
            Your API key is configured as an environment variable <code className="px-1.5 py-0.5 rounded bg-zinc-700 text-violet-300 font-mono text-xs">GEMINI_API_KEY</code>
          </p>
          <p className="text-sm text-zinc-400">
            This is more secure than storing it in a database. Set it in your deployment platform's environment variables.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Get API Key
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4 animate-fade-in stagger-2">
        <div className="card bg-violet-500/5 border-violet-500/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-violet-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-zinc-200 mb-1">Environment Variables</h3>
              <p className="text-sm text-zinc-500">
                Set <code className="text-violet-300">GEMINI_API_KEY</code> in your hosting platform's settings.
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-zinc-800/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-zinc-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-zinc-200 mb-1">Usage & Billing</h3>
              <p className="text-sm text-zinc-500">
                Translation usage is billed through your Gemini API quota.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

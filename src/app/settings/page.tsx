'use client'

import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, ExternalLink, Shield, AlertCircle, CheckCircle, Globe } from 'lucide-react'

interface Config {
  apiKey: string
  baseUrl: string
  model: string
}

const PROVIDERS = [
  { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', models: ['google/gemini-2.0-flash', 'openai/gpt-4o-mini', 'anthropic/claude-3-haiku'] },
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] },
  { name: 'Ollama', baseUrl: 'http://localhost:11434/v1', models: ['llama3.2', 'mistral', 'codellama'] },
  { name: 'Custom', baseUrl: '', models: [] },
]

export default function Settings() {
  const [config, setConfig] = useState<Config>({ apiKey: '', baseUrl: '', model: '' })
  const [hasKey, setHasKey] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setHasKey(!!data.apiKey)
        setConfig({
          apiKey: data.apiKey || '',
          baseUrl: data.baseUrl || '',
          model: data.model || '',
        })
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
        <p className="text-zinc-400">Configure your LLM provider</p>
      </div>

      {/* API Configuration */}
      <div className="card animate-fade-in stagger-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">LLM Configuration</h2>
            <p className="text-sm text-zinc-500">Set as environment variables</p>
          </div>
          {hasKey && (
            <div className="ml-auto flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Configured</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={config.apiKey}
              placeholder="sk-..."
              className="input-field font-mono"
              disabled
            />
            <p className="text-xs text-zinc-500 mt-1">
              Set <code className="text-violet-300">LLM_API_KEY</code> in your hosting platform's environment variables
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Base URL
            </label>
            <input
              type="text"
              value={config.baseUrl}
              placeholder="https://api.openai.com/v1"
              className="input-field font-mono text-sm"
              disabled
            />
            <p className="text-xs text-zinc-500 mt-1">
              Set <code className="text-violet-300">LLM_BASE_URL</code> (defaults to OpenRouter)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Model
            </label>
            <input
              type="text"
              value={config.model}
              placeholder="google/gemini-2.0-flash"
              className="input-field font-mono text-sm"
              disabled
            />
            <p className="text-xs text-zinc-500 mt-1">
              Set <code className="text-violet-300">LLM_MODEL</code>
            </p>
          </div>
        </div>
      </div>

      {/* Provider Quick Links */}
      <div className="card animate-fade-in stagger-2">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-violet-400" />
          <h3 className="font-semibold">Quick Setup</h3>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">Environment variables to set:</p>
          
          <div className="grid gap-2">
            <CodeBlock name="LLM_API_KEY" value="your-api-key" />
            <CodeBlock name="LLM_BASE_URL" value="https://openrouter.ai/api/v1" />
            <CodeBlock name="LLM_MODEL" value="google/gemini-2.0-flash" />
          </div>

          <a
            href="https://openrouter.ai/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors mt-2"
          >
            Get OpenRouter API Key
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4 animate-fade-in stagger-3">
        <div className="card bg-violet-500/5 border-violet-500/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-violet-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-zinc-200 mb-1">Secure</h3>
              <p className="text-sm text-zinc-500">
                API keys stay in environment variables, never in code.
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-zinc-800/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-zinc-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-zinc-200 mb-1">Usage</h3>
              <p className="text-sm text-zinc-500">
                Billing is handled by your LLM provider directly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CodeBlock({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded bg-zinc-800/50 border border-zinc-700 text-sm">
      <span className="text-violet-400 font-mono">{name}</span>
      <span className="text-zinc-500">=</span>
      <span className="text-zinc-400 font-mono truncate">{value}</span>
    </div>
  )
}

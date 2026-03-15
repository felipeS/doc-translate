'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, ArrowRight, Loader2, CheckCircle, Sparkles, File, X, BookOpen, Globe } from 'lucide-react'

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'cs', name: 'Czech' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'ro', name: 'Romanian' },
  { code: 'uk', name: 'Ukrainian' },
]

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [translating, setTranslating] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; downloadUrl?: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState('en')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.name.endsWith('.docx')) {
        setFile(selectedFile)
        setResult(null)
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0]
      if (selectedFile.name.endsWith('.docx')) {
        setFile(selectedFile)
        setResult(null)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const clearFile = () => {
    setFile(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleTranslate = async () => {
    if (!file) return

    setTranslating(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('targetLanguage', targetLanguage)

      const response = await fetch('/api/translate', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setResult({ success: true, message: 'Translation complete!', downloadUrl: url })
      } else {
        const data = await response.json()
        setResult({ success: false, message: data.error || 'Translation failed' })
      }
    } catch (error) {
      setResult({ success: false, message: 'An error occurred during translation' })
    } finally {
      setTranslating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="text-center py-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-6">
          <Sparkles className="w-4 h-4" />
          <span>AI-powered translation</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
          Translate Documents with{' '}
          <span className="gradient-text">AI Precision</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto">
          Upload your DOCX files and get professional translations powered by Gemini AI. 
          Includes custom glossary support for consistent terminology.
        </p>
      </div>

      {/* Language picker */}
      <div className="flex justify-center animate-fade-in stagger-1">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
          <Globe className="w-5 h-5 text-zinc-400" />
          <span className="text-zinc-300 font-medium">Translate to:</span>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload zone */}
      <div 
        className={`
          relative overflow-hidden rounded-2xl transition-all duration-300 animate-fade-in stagger-2
          ${dragOver 
            ? 'border-violet-500 bg-violet-500/5 scale-[1.02]' 
            : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
          }
          border-2 border-dashed cursor-pointer
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="p-12 text-center">
          <div className={`
            w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center transition-all duration-300
            ${dragOver 
              ? 'bg-violet-500/20 scale-110' 
              : 'bg-zinc-800'
            }
          `}>
            {dragOver ? (
              <Sparkles className="w-10 h-10 text-violet-400" />
            ) : (
              <Upload className="w-10 h-10 text-zinc-500" />
            )}
          </div>
          
          <h3 className="text-xl font-semibold mb-2">
            {dragOver ? 'Drop your file here' : 'Upload your document'}
          </h3>
          <p className="text-zinc-500">
            Drag and drop your DOCX file here, or click to browse
          </p>
          <p className="text-zinc-600 text-sm mt-4">
            Supports .docx files up to 10MB
          </p>
        </div>
      </div>

      {/* File selected */}
      {file && (
        <div className="card animate-fade-in stagger-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-100">{file.name}</p>
                <p className="text-sm text-zinc-500">
                  {(file.size / 1024).toFixed(1)} KB → {LANGUAGES.find(l => l.code === targetLanguage)?.name}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); clearFile(); }}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Translate button */}
      {file && !result && (
        <div className="flex justify-center animate-fade-in stagger-3">
          <button
            onClick={handleTranslate}
            disabled={translating}
            className="btn-primary inline-flex items-center gap-3 text-lg"
          >
            {translating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Translate with AI
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`
          card animate-fade-in
          ${result.success 
            ? 'border-green-500/20 bg-green-500/5' 
            : 'border-red-500/20 bg-red-500/5'
          }
        `}>
          {result.success ? (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-green-400 font-medium text-lg">{result.message}</p>
              <a
                href={result.downloadUrl}
                download={`translated_${file?.name}`}
                className="btn-primary inline-flex items-center gap-2"
              >
                <File className="w-5 h-5" />
                Download Translated Document
              </a>
              <button
                onClick={clearFile}
                className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                Translate another document
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-red-400">{result.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-4 mt-12 animate-fade-in stagger-4">
        <FeatureCard 
          icon={Sparkles}
          title="AI-Powered"
          description="Advanced translation using Gemini AI with context awareness"
        />
        <FeatureCard 
          icon={BookOpen}
          title="Custom Glossary"
          description="Define your own terminology for consistent translations"
        />
        <FeatureCard 
          icon={FileText}
          title="DOCX Support"
          description="Full support for Microsoft Word documents"
        />
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="card group">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
        <Icon className="w-6 h-6 text-violet-400" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-zinc-500">{description}</p>
    </div>
  )
}

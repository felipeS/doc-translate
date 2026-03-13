'use client'

import { useState } from 'react'
import { Upload, FileText, ArrowRight, Loader2 } from 'lucide-react'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [translating, setTranslating] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; downloadUrl?: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleTranslate = async () => {
    if (!file) return

    setTranslating(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/translate', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.downloadUrl) {
        setResult({ success: true, message: 'Translation complete!', downloadUrl: data.downloadUrl })
      } else {
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
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Translate Documents</h1>
        <p className="mt-2 text-gray-600">Upload a DOCX file and translate it using Gemini AI</p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors">
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Upload DOCX
            </span>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              accept=".docx"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
        </div>
        {file && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4" />
            <span>{file.name}</span>
            <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}
      </div>

      {file && (
        <div className="flex justify-center">
          <button
            onClick={handleTranslate}
            disabled={translating}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {translating ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Translating...
              </>
            ) : (
              <>
                Translate <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </button>
        </div>
      )}

      {result && (
        <div className={`rounded-md p-4 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
          {result.success ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-green-800">{result.message}</p>
              <a
                href={result.downloadUrl}
                download
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                Download Translated File
              </a>
            </div>
          ) : (
            <p className="text-red-800">{result.message}</p>
          )}
        </div>
      )}
    </div>
  )
}

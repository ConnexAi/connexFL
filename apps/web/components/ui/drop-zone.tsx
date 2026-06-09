'use client'

import { useState, useRef, useCallback } from 'react'
import type { DragEvent, ChangeEvent, KeyboardEvent } from 'react'

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function UploadIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className={active ? 'text-terracotta' : 'text-ink-3'}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className="text-ink-3 shrink-0">
      <path d="M3.5 1.5h6l3 3v9.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5Z" />
      <path d="M9.5 1.5V4.5h3" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="3" x2="13" y2="13" />
      <line x1="13" y1="3" x2="3" y2="13" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      className="animate-spin text-ink-3">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"
        strokeDasharray="63" strokeDashoffset="47" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function normalizeExt(ext: string): string {
  return ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DropZoneProps {
  accept?: string[]
  multiple?: boolean
  onFiles: (files: File[]) => void
  label?: string
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DropZone({
  accept = [],
  multiple = false,
  onFiles,
  label,
  isLoading = false,
}: DropZoneProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptAttr = accept.length > 0
    ? accept.map(normalizeExt).join(',')
    : undefined

  const processIncoming = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming)
      const filtered =
        accept.length > 0
          ? arr.filter((f) =>
              accept.some((ext) => f.name.toLowerCase().endsWith(normalizeExt(ext)))
            )
          : arr
      const next = multiple ? [...files, ...filtered] : filtered.slice(0, 1)
      setFiles(next)
      onFiles(next)
    },
    [accept, files, multiple, onFiles]
  )

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index)
    setFiles(next)
    onFiles(next)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (!isLoading) setIsDragging(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (!isLoading && e.dataTransfer.files.length > 0) {
      processIncoming(e.dataTransfer.files)
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      processIncoming(e.target.files)
      e.target.value = ''
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  const dropAreaCls = [
    'flex flex-col items-center justify-center gap-3',
    'rounded-[16px] border-2 px-6 py-8 text-center',
    'transition-colors duration-150 select-none',
    isLoading
      ? 'border-dashed border-border-subtle opacity-60 cursor-not-allowed'
      : isDragging
        ? 'border-solid border-terracotta bg-terracotta-dim cursor-copy'
        : 'border-dashed border-border hover:border-border hover:bg-surface cursor-pointer',
  ].join(' ')

  return (
    <div className="space-y-2.5">
      {/* Drop area */}
      <div
        role="button"
        tabIndex={isLoading ? -1 : 0}
        aria-label={label ?? 'Zona de carga de archivos'}
        aria-disabled={isLoading}
        onClick={() => !isLoading && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        className={dropAreaCls}
      >
        {isLoading ? (
          <>
            <SpinnerIcon />
            <p className="text-[13px] text-ink-2">Subiendo archivos...</p>
          </>
        ) : (
          <>
            <UploadIcon active={isDragging} />
            <div>
              <p className="text-[13px] font-medium text-ink leading-snug">
                {label ?? 'Arrastra archivos aquí o haz clic para seleccionar'}
              </p>
              {accept.length > 0 && (
                <p className="text-[12px] text-ink-3 mt-1">
                  Acepta: {accept.map(normalizeExt).join(', ')}
                </p>
              )}
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          multiple={multiple}
          onChange={handleChange}
          disabled={isLoading}
          className="sr-only"
          aria-hidden="true"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-1.5" role="list" aria-label="Archivos seleccionados">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] bg-surface border border-border-subtle"
            >
              <FileIcon />
              <span className="flex-1 min-w-0 text-[13px] font-medium text-ink truncate">
                {file.name}
              </span>
              <span className="text-[12px] text-ink-3 font-mono tabular-nums shrink-0">
                {formatSize(file.size)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(i)
                }}
                disabled={isLoading}
                aria-label={`Eliminar ${file.name}`}
                className="text-ink-3 hover:text-ink-2 transition-colors duration-150 shrink-0 disabled:opacity-40"
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

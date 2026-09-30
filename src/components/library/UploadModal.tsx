'use client';

import { useState, useRef, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { upload } from '@vercel/blob/client';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

export default function UploadModal({ isOpen, onClose, onUploadComplete }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFile = useCallback(async (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isEpub = lowerName.endsWith('.epub');
    const isPdf = lowerName.endsWith('.pdf');

    if (!isEpub && !isPdf) {
      setError('Only EPUB and PDF files are supported.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('File size exceeds 100MB limit.');
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgressPercent(null);
    setElapsedSeconds(0);
    setFileDetails({ name: file.name, size: formatFileSize(file.size) });
    setUploadProgress('Preparing upload…');

    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    try {
      let response: Response;

      // Extract text & structure directly in browser to bypass Serverless timeouts and ensure fast DB writes
      setProgressPercent(null);
      setUploadProgress(`Extracting content from ${isEpub ? 'EPUB' : 'PDF'}…`);
      let clientProcessed = null;
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (isEpub) {
          const { processEpub } = await import('@/lib/epub/process');
          clientProcessed = await processEpub(arrayBuffer, (current, total) => {
            const pct = Math.round((current / total) * 100);
            setUploadProgress(`Extracting chapter ${current} of ${total} (${pct}%)…`);
            setProgressPercent(pct);
          });
        } else {
          const { processPdf } = await import('@/lib/pdf/process');
          clientProcessed = await processPdf(arrayBuffer, (current, total) => {
            const pct = Math.round((current / total) * 100);
            setUploadProgress(`Extracting page ${current} of ${total} (${pct}%)…`);
            setProgressPercent(pct);
          });
        }
      } catch (extractErr) {
        console.warn('Client extraction failed, falling back to server extraction:', extractErr);
      }

      // If file > 4MB on Vercel, upload file to Blob storage
      if (file.size > 4 * 1024 * 1024) {
        try {
          setProgressPercent(null);
          setUploadProgress('Uploading to cloud storage…');
          let newBlob;
          try {
            newBlob = await upload(file.name, file, {
              access: 'private',
              handleUploadUrl: '/api/upload/blob',
              onUploadProgress: (p) => {
                const pct = Math.round(p.percentage);
                setProgressPercent(pct);
                if (pct >= 100) {
                  setUploadProgress('Finalizing cloud storage upload…');
                } else {
                  setUploadProgress(`Uploading to cloud storage (${pct}%)…`);
                }
              },
            });
          } catch (privateErr) {
            console.warn('Private upload failed, trying public:', privateErr);
            newBlob = await upload(file.name, file, {
              access: 'public',
              handleUploadUrl: '/api/upload/blob',
              onUploadProgress: (p) => {
                const pct = Math.round(p.percentage);
                setProgressPercent(pct);
                if (pct >= 100) {
                  setUploadProgress('Finalizing cloud storage upload…');
                } else {
                  setUploadProgress(`Uploading to cloud storage (${pct}%)…`);
                }
              },
            });
          }

          // Step 3: Save to database
          setProgressPercent(null);
          setUploadProgress('Saving book to library…');
          response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              blobUrl: newBlob.url,
              fileName: file.name,
              processed: clientProcessed,
            }),
          });
        } catch (blobErr) {
          console.error('Blob upload error:', blobErr);
          if (file.size <= 4.5 * 1024 * 1024) {
            setUploadProgress('Uploading via server fallback…');
            const formData = new FormData();
            formData.append('file', file);
            response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });
          } else {
            throw new Error(`Upload to storage failed: ${blobErr instanceof Error ? blobErr.message : 'Network error'}`);
          }
        }
      } else {
        // For files <= 4MB: if client extraction succeeded, we can post json or form data
        if (clientProcessed && clientProcessed.chapters) {
          setProgressPercent(null);
          setUploadProgress('Saving book to library…');
          // For storage key, we can upload file or use server fallback
          const formData = new FormData();
          formData.append('file', file);
          response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
        } else {
          const formData = new FormData();
          formData.append('file', file);
          setUploadProgress(`Uploading and processing ${isEpub ? 'EPUB' : 'PDF'}…`);
          response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
        }
      }

      if (!response.ok) {
        let errorMsg = `Upload failed (HTTP ${response.status})`;
        try {
          const rawText = await response.text();
          try {
            const data = JSON.parse(rawText);
            errorMsg = data.error || rawText || errorMsg;
          } catch {
            if (response.status === 413) {
              errorMsg = 'File size exceeds 4.5MB. Direct cloud storage upload is required.';
            } else if (response.status === 504) {
              errorMsg = 'Server execution timed out. Please try again.';
            } else {
              errorMsg = rawText || errorMsg;
            }
          }
        } catch {
          // If reading text fails, keep default errorMsg
        }
        throw new Error(errorMsg);
      }

      setUploadProgress('Done!');
      onUploadComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      clearInterval(timer);
      setIsUploading(false);
      setUploadProgress('');
      setProgressPercent(null);
      setElapsedSeconds(0);
    }
  }, [onClose, onUploadComplete]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Book (EPUB or PDF)">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          isDragging
            ? 'border-neutral-900 bg-neutral-50 dark:border-neutral-300 dark:bg-neutral-800'
            : 'border-neutral-300 dark:border-neutral-600'
        }`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
            <Spinner size="lg" />
            <div className="w-full">
              {fileDetails && (
                <div className="mb-2 text-center">
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-xs mx-auto">
                    {fileDetails.name}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {fileDetails.size} • {elapsedSeconds} detik berjalan
                  </p>
                </div>
              )}
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{uploadProgress}</p>
              {progressPercent !== null && (
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-blue-600 h-full transition-all duration-150 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                Buku diekstrak secara otomatis menjadi teks nyaman baca dengan struktur bab yang rapi.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
              Drag and drop your EPUB or PDF here
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-4">
              or
            </p>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Choose File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".epub,.pdf,application/epub+zip,application/pdf"
              onChange={handleFileInput}
              className="hidden"
            />
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
        EPUB and PDF files up to 100MB. Chapters and typography are formatted for optimal reading.
      </p>
    </Modal>
  );
}

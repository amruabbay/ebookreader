'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  initialContent?: string;
  onSave: (content: string) => Promise<void>;
  onDeleteHighlight?: () => Promise<void>;
}

export default function NoteEditorModal({
  isOpen,
  onClose,
  selectedText,
  initialContent = '',
  onSave,
  onDeleteHighlight,
}: NoteEditorModalProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialContent ? 'Edit Note' : 'Add Note'}
    >
      <div className="space-y-4">
        {/* Highlighted text preview */}
        <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 border-l-4 border-amber-400">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1 uppercase tracking-wider">
            Highlighted Passage
          </p>
          <p className="text-xs text-neutral-800 dark:text-neutral-200 italic line-clamp-3">
            &ldquo;{selectedText}&rdquo;
          </p>
        </div>

        {/* Note textarea */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Your Thoughts / Annotation
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your reflection, summary, or question..."
            rows={4}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            autoFocus
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          {onDeleteHighlight ? (
            <button
              onClick={async () => {
                await onDeleteHighlight();
                onClose();
              }}
              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 transition-colors cursor-pointer"
            >
              Remove Highlight
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSaving}
            >
              Save Note
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

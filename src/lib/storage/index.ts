import path from 'path';
import fs from 'fs';
import { writeFile, unlink, mkdir } from 'fs/promises';

export interface UploadResult {
  url: string;
  storageKey: string;
}

function getUploadsDir(): string {
  // On Vercel serverless, process.cwd() is read-only, so use /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'uploads');
  }
  return path.join(process.cwd(), 'uploads');
}

/**
 * Save an uploaded file to Vercel Blob (if configured) or local filesystem / /tmp.
 */
export async function saveFile(
  file: File | Blob | Buffer,
  filename: string
): Promise<UploadResult> {
  // If Vercel Blob token is configured, use Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import('@vercel/blob');
      let blob;
      try {
        blob = await put(filename, file, { access: 'private' });
      } catch {
        blob = await put(filename, file, { access: 'public' });
      }
      return {
        url: blob.url,
        storageKey: blob.url,
      };
    } catch (blobErr) {
      console.error('Vercel Blob put error, falling back to temp disk:', blobErr);
    }
  }

  // Filesystem fallback (/tmp on Vercel, uploads/ locally)
  const dir = getUploadsDir();
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);

  let buffer: Buffer;
  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else if ('arrayBuffer' in file) {
    const ab = await file.arrayBuffer();
    buffer = Buffer.from(ab);
  } else {
    throw new Error('Unsupported file input type');
  }

  await writeFile(filePath, buffer);
  return {
    url: `/uploads/${filename}`,
    storageKey: filename,
  };
}

/**
 * Delete a file from Vercel Blob or local/temp filesystem.
 */
export async function deleteFile(storageKey: string): Promise<void> {
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { del } = await import('@vercel/blob');
        await del(storageKey);
      } catch (err) {
        console.error('Failed to delete blob from Vercel Blob:', err);
      }
      return;
    }
  }

  // Filesystem fallback
  try {
    const dir = getUploadsDir();
    const filePath = path.join(dir, path.basename(storageKey));
    if (fs.existsSync(filePath)) {
      await unlink(filePath);
    }
  } catch (err) {
    console.error('Failed to delete file:', err);
  }
}

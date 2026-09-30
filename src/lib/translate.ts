import type { ContentBlock } from '@/types';

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
}

const ANDROID_UA =
  'AndroidTranslate/5.3.0.RC02.130475354-53000263 5.1 phone TRANSLATE_69J client';

const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-lite-latest',
];

/**
 * Translate using Gemini AI if GEMINI_API_KEY is available
 */
async function translateWithGemini(
  text: string,
  targetLang: string = 'id'
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Anda adalah penerjemah sastra dan novel profesional.
Terjemahkan judul atau teks berikut ke dalam Bahasa Indonesia dengan gaya bahasa yang luwes, alami, dan sastrawi (bukan terjemahan mesin kaku).
Pahami konteks karya sastra klasik atau drama.
Keluarkan HANYA hasil terjemahannya saja tanpa tanda kutip pembuka/penutup atau penjelasan tambahan.

Teks:
${text}`;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(4500),
      });

      if (res.ok) {
        const data = await res.json();
        const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (translated) {
          return translated.replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // try next model
    }
  }

  return null;
}

/**
 * Translate an array of ContentBlocks using Gemini AI structured JSON output
 */
async function translateBlocksWithGemini(
  blocks: ContentBlock[],
  targetLang: string = 'id'
): Promise<ContentBlock[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || blocks.length === 0) return null;

  const prompt = `Anda adalah penerjemah karya sastra dan novel profesional.
Tugas Anda adalah menerjemahkan teks naskah drama atau novel berikut ke dalam Bahasa Indonesia dengan gaya bahasa yang luwes, alami, indah, dan mendalam sesuai konteks karya aslinya.
Pahami konteksnya dengan seksama:
- Terjemahkan dialog dan narasi dengan luwes layaknya novel sastra resmi.
- Pertahankan struktur JSON array yang sama persis: [ { "type": string, "text": string } ].
Pastikan setiap objek memiliki "type" yang sama dengan aslinya, dan "text" yang telah diterjemahkan ke Bahasa Indonesia.

Input:
${JSON.stringify(blocks.map((b) => ({ type: b.type, text: b.text })))}`;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          if (Array.isArray(parsed) && parsed.length === blocks.length) {
            return blocks.map((original, i) => ({
              ...original,
              text: parsed[i].text || original.text,
            }));
          }
        }
      }
    } catch (err) {
      console.warn(`Gemini translation with ${model} failed:`, err);
    }
  }

  return null;
}

/**
 * Translates a single text (e.g. title) with Gemini first, fallback to Google mobile
 */
export async function translateSingleText(
  text: string,
  fromLang: string = 'en',
  toLang: string = 'id'
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  // 1. Try Google Translate mobile client first for instant ~150ms response
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(
      trimmed
    )}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': ANDROID_UA, Accept: '*/*' },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((item: unknown[]) => item[0]).join('');
        if (translated) return decodeHtmlEntities(translated);
      }
    }
  } catch (err) {
    console.warn('Google Translate single failed, trying Gemini:', err);
  }

  // 2. Fallback to Gemini AI if available
  if (toLang === 'id') {
    const aiResult = await translateWithGemini(trimmed, toLang);
    if (aiResult) return aiResult;
  }

  return text;
}

const DELIMITER = ' ||| ';
const MAX_BATCH_CHARS = 2400;

/**
 * Helper to translate a single text batch via Google Translate endpoint
 */
async function translateBatchRequest(
  text: string,
  fromLang: string = 'en',
  toLang: string = 'id'
): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(
    text
  )}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': ANDROID_UA, Accept: '*/*' },
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    throw new Error(`Google translate returned status ${res.status}`);
  }

  const data = await res.json();
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const rawTranslated = data[0].map((item: unknown[]) => item[0]).join('');
    return decodeHtmlEntities(rawTranslated);
  }

  throw new Error('Invalid translation response');
}

/**
 * Translates blocks with ultra-fast parallel batching (under 2s for full chapters)
 */
export async function translateBlocks(
  blocks: ContentBlock[],
  fromLang: string = 'en',
  toLang: string = 'id'
): Promise<ContentBlock[]> {
  if (blocks.length === 0) return [];

  // 1. For short excerpts (<= 12 blocks), optionally try Gemini AI if within 5s
  if (toLang === 'id' && process.env.GEMINI_API_KEY && blocks.length <= 12) {
    try {
      const aiResult = await translateBlocksWithGemini(blocks, toLang);
      if (aiResult) return aiResult;
    } catch {
      // Fall through to fast parallel batching
    }
  }

  // 2. Ultra-Fast Parallel Batching with robust delimiter
  interface BatchItem {
    indices: number[];
    text: string;
  }

  const batches: BatchItem[] = [];
  let currentIndices: number[] = [];
  let currentTexts: string[] = [];
  let currentLength = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const text = (block.text || '').trim();

    if (!text) continue;

    if (currentLength + text.length > MAX_BATCH_CHARS && currentIndices.length > 0) {
      batches.push({
        indices: currentIndices,
        text: currentTexts.join(DELIMITER),
      });
      currentIndices = [i];
      currentTexts = [text];
      currentLength = text.length;
    } else {
      currentIndices.push(i);
      currentTexts.push(text);
      currentLength += text.length + DELIMITER.length;
    }
  }

  if (currentIndices.length > 0) {
    batches.push({
      indices: currentIndices,
      text: currentTexts.join(DELIMITER),
    });
  }

  const result: ContentBlock[] = blocks.map((b) => ({ ...b }));

  // Execute all batches in parallel
  await Promise.all(
    batches.map(async (batch) => {
      try {
        const decoded = await translateBatchRequest(batch.text, fromLang, toLang);
        const parts = decoded.split(/\s*\|\|\|\s*/);

        if (parts.length === batch.indices.length) {
          batch.indices.forEach((originalIdx, pIdx) => {
            result[originalIdx] = {
              ...result[originalIdx],
              text: parts[pIdx].trim(),
            };
          });
          return;
        }
      } catch (err) {
        console.warn('Batch translation failed, attempting parallel block fallback:', err);
      }

      // Parallel fallback for items in this batch only
      await Promise.all(
        batch.indices.map(async (idx) => {
          try {
            const single = await translateSingleText(blocks[idx].text, fromLang, toLang);
            result[idx] = { ...result[idx], text: single };
          } catch {
            // Keep original on error
          }
        })
      );
    })
  );

  return result;
}

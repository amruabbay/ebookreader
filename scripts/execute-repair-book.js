const { createClient } = require('@libsql/client');
const { v4: uuidv4 } = require('uuid');

const PROMOTIONAL_PATTERNS = [
  /terima\s+kasih\s+telah\s+mengunduh/i,
  /ebook\s+simon\s*&\s*schuster/i,
  /klik\s+di\s+sini\s+untuk\s+mendaftar/i,
  /click\s+here\s+to\s+sign\s+up/i,
  /dapatkan\s+ebook\s+gratis/i,
  /kami\s+harap\s+anda\s+menikmati/i,
  /sign\s+up\s+to\s+get\s+more/i,
  /join\s+our\s+mailing\s+list/i,
  /milis\s+kami/i,
];

function isPromo(title, contentStr) {
  for (const pat of PROMOTIONAL_PATTERNS) {
    if (pat.test(title)) return true;
  }
  if (contentStr && /dapatkan ebook gratis|klik di sini untuk mendaftar|milis kami/i.test(contentStr)) {
    return true;
  }
  return false;
}

// Pretty chapter title mapping for 7 Habits
function cleanTitle(raw) {
  let t = raw
    .replace(/\s+/g, ' ')
    .replace(/\s+:\s+/g, ': ')
    .replace(/—\s*—+/g, '—')
    .replace(/\s*—\s*/g, ' — ')
    .trim();

  // Clean trailing punctuation
  t = t.replace(/[\:\.\,\—\s]+$/, '').trim();

  // Known cleanups for 7 Habits book
  if (/EDISI OLEH SEAN COVEY.*KATA PENGANTAR/i.test(t)) {
    return 'Kata Pengantar Edisi HUT ke-30 — oleh Sean Covey';
  }
  if (/Bagian satu.*LUAR DALAM/i.test(t)) {
    return 'Bagian Satu: Paradigma dan Prinsip — Luar Dalam';
  }
  if (/Bagian kedua.*KEBIASAAN 1/i.test(t)) {
    return 'Bagian Dua: Kemenangan Pribadi — Kebiasaan 1: Menjadi Proaktif';
  }
  if (/KEBIASAAN 2.*PRINSIP KEPEMIMPINAN/i.test(t)) {
    return 'Kebiasaan 2: Memulai dengan Akhir dalam Pikiran — Prinsip Kepemimpinan Pribadi';
  }
  if (/KEBIASAAN 3.*DAPATKAN HAL PERTAMA/i.test(t)) {
    return 'Kebiasaan 3: Dahulukan yang Utama — Prinsip Manajemen Pribadi';
  }
  if (/Bagian ketiga.*PARADIGMA INTERDEPENDENSI/i.test(t)) {
    return 'Bagian Tiga: Kemenangan Publik — Paradigma Saling Ketergantungan';
  }
  if (/PRINSIP INTERPERSONAL.*KEPEMIMPINAN/i.test(t)) {
    return 'Kebiasaan 4: Berpikir Menang-Menang — Prinsip Kepemimpinan Interpersonal';
  }
  if (/KEBIASAAN 5.*KOMUNIKASI/i.test(t) || /BERUSAHA PERTAMA UNTUK MEMAHAMI/i.test(t)) {
    return 'Kebiasaan 5: Berusaha Memahami Dahulu, Baru Dipahami — Prinsip Komunikasi Empatis';
  }
  if (/KEBIASAAN 6.*SINERGI/i.test(t)) {
    return 'Kebiasaan 6: Wujudkan Sinergi — Prinsip Kerjasama Kreatif';
  }
  if (/Bagian Empat.*KEBIASAAN 7/i.test(t) || /MENATAHKAN SAW/i.test(t)) {
    return 'Bagian Empat: Pembaruan — Kebiasaan 7: Mengasah Gergaji (Sharpen the Saw)';
  }
  if (/PENUTUP.*STEPHEN R/i.test(t)) {
    return 'Penutup: Tanya & Jawab dengan Stephen R. Covey';
  }

  return t;
}

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const bookId = '66babd76-9dd0-4563-9f0c-bf0dc4967f24';
  const r = await client.execute({
    sql: 'SELECT id, title, order_index, content FROM chapters WHERE book_id = ? ORDER BY order_index ASC',
    args: [bookId],
  });

  const rawChapters = r.rows.map((row) => ({
    id: row.id,
    title: String(row.title || '').trim(),
    orderIndex: row.order_index,
    content: JSON.parse(row.content || '[]'),
  }));

  console.log(`Initial chapters count: ${rawChapters.length}`);

  // 1. Filter out promotional chapters
  const nonPromo = rawChapters.filter((ch) => {
    const textSample = ch.content.map((b) => b.text || '').join(' ');
    if (isPromo(ch.title, textSample)) {
      console.log(`[DELETE PROMO] #${ch.orderIndex}: "${ch.title}"`);
      return false;
    }
    return true;
  });

  // 2. Merge fragments and micro-chapters
  const merged = [];
  let pendingPrefixes = [];

  for (let i = 0; i < nonPromo.length; i++) {
    const ch = nonPromo[i];
    const totalChars = ch.content.reduce((sum, b) => sum + (b.text || '').length, 0);

    // If chapter is an empty heading line or tiny fragment like "orang."
    if (totalChars < 150 || (totalChars < 300 && /^[a-z0-9\.\,\;\:\s]{1,15}$/i.test(ch.title))) {
      console.log(`[MERGING FRAGMENT] #${ch.orderIndex} "${ch.title}" (${totalChars} chars)`);
      if (ch.title && ch.title !== 'orang.') {
        pendingPrefixes.push(ch.title);
      }
      if (ch.content.length > 0 && merged.length > 0) {
        merged[merged.length - 1].content.push(...ch.content);
      }
      continue;
    }

    let combinedTitle = ch.title;
    if (pendingPrefixes.length > 0) {
      combinedTitle = `${pendingPrefixes.join(' — ')} — ${ch.title}`;
      pendingPrefixes = [];
    }

    combinedTitle = cleanTitle(combinedTitle);

    merged.push({
      title: combinedTitle,
      content: ch.content,
    });
  }

  console.log(`\nFinal Clean Chapters Count: ${merged.length}`);
  merged.forEach((ch, idx) => {
    console.log(`${idx + 1}. [${ch.title}]`);
  });

  // 3. Write to database atomically
  console.log('\nWriting clean chapters to Turso DB...');
  await client.execute({
    sql: 'DELETE FROM chapters WHERE book_id = ?',
    args: [bookId],
  });

  // Insert merged chapters
  const insertStmts = merged.map((ch, idx) => ({
    sql: 'INSERT INTO chapters (id, book_id, title, order_index, content) VALUES (?, ?, ?, ?, ?)',
    args: [uuidv4(), bookId, ch.title, idx, JSON.stringify(ch.content)],
  }));

  const CHUNK_SIZE = 20;
  for (let i = 0; i < insertStmts.length; i += CHUNK_SIZE) {
    await client.batch(insertStmts.slice(i, i + CHUNK_SIZE), 'write');
  }

  // Update total_chapters in books table
  await client.execute({
    sql: 'UPDATE books SET total_chapters = ?, title = ? WHERE id = ?',
    args: [merged.length, '7 Kebiasaan Manusia yang Sangat Efektif — Stephen R. Covey', bookId],
  });

  console.log('Database updated successfully!');
}

main().catch(console.error);

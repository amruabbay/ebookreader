const { createClient } = require('@libsql/client');

const PROMOTIONAL_PATTERNS = [
  /terima\s+kasih\s+telah\s+mengunduh/i,
  /ebook\s+simon\s*&\s*schuster/i,
  /klik\s+di\s+sini\s+untuk\s+mendaftar/i,
  /click\s+here\s+to\s+sign\s+up/i,
  /dapatkan\s+ebook\s+gratis/i,
  /kami\s+harap\s+anda\s+menikmati/i,
  /sign\s+up\s+to\s+get\s+more/i,
  /join\s+our\s+mailing\s+list/i,
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

  // 1. Filter out purely promotional chapters
  const nonPromo = rawChapters.filter((ch) => {
    const textSample = ch.content.map((b) => b.text || '').join(' ');
    if (isPromo(ch.title, textSample)) {
      console.log(`[REMOVING PROMO CHAPTER] #${ch.orderIndex}: "${ch.title}"`);
      return false;
    }
    return true;
  });

  console.log(`After removing promo: ${nonPromo.length}`);

  // 2. Merge empty / micro chapters (length < 150 chars) with subsequent chapters or previous
  const merged = [];
  let pendingTitlePrefix = [];

  for (let i = 0; i < nonPromo.length; i++) {
    const ch = nonPromo[i];
    const totalChars = ch.content.reduce((sum, b) => sum + (b.text || '').length, 0);

    if (totalChars < 150) {
      // It's a title fragment or micro chapter
      console.log(`[FRAGMENT DETECTED] #${ch.orderIndex} "${ch.title}" (chars: ${totalChars})`);
      pendingTitlePrefix.push(ch.title);
      continue;
    }

    // Combine any pending title prefixes
    let combinedTitle = ch.title;
    if (pendingTitlePrefix.length > 0) {
      // E.g. ["Bagian satu", "PARADIGMA dan PRINSIP"] + "LUAR DALAM"
      // => "Bagian Satu: Paradigma dan Prinsip — Luar Dalam"
      const prefix = pendingTitlePrefix.join(' — ');
      combinedTitle = `${prefix} — ${ch.title}`;
      pendingTitlePrefix = [];
    }

    // Clean up title punctuation/casing
    combinedTitle = combinedTitle
      .replace(/\s+/g, ' ')
      .replace(/\s+:\s+/g, ': ')
      .replace(/—\s*—+/g, '—')
      .replace(/\s*—\s*/g, ' — ')
      .trim();

    merged.push({
      id: ch.id,
      title: combinedTitle,
      content: ch.content,
    });
  }

  // If there are still pending title prefixes at the end, append to last chapter
  if (pendingTitlePrefix.length > 0 && merged.length > 0) {
    const last = merged[merged.length - 1];
    last.title = `${last.title} — ${pendingTitlePrefix.join(' — ')}`;
  }

  console.log('\n--- PROPOSED CLEAN CHAPTER LIST ---');
  merged.forEach((ch, idx) => {
    console.log(`${idx + 1}. [${ch.title}]`);
  });
  console.log(`\nTotal clean chapters: ${merged.length}`);
}

main().catch(console.error);

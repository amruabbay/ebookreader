const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const BOOK_ID = '66babd76-9dd0-4563-9f0c-bf0dc4967f24';

const CHAPTER_GROUPS = [
  {
    title: 'Preface',
    indices: [0],
  },
  {
    title: 'Ucapan Terima Kasih',
    indices: [1],
  },
  {
    title: 'Kata Pengantar — oleh Jim Collins',
    indices: [2],
  },
  {
    title: 'Kata Pengantar Edisi HUT ke-30 — oleh Sean Covey',
    indices: [3],
  },
  {
    title: 'Bagian Satu: Paradigma dan Prinsip — Luar Dalam',
    indices: [4],
  },
  {
    title: '7 Kebiasaan — Tinjauan Umum',
    indices: [5, 6, 7],
  },
  {
    title: 'Bagian Dua: Kemenangan Pribadi — Kebiasaan 1: Menjadi Proaktif',
    indices: [8, 9, 10, 11],
  },
  {
    title: 'Kebiasaan 2: Memulai dengan Akhir dalam Pikiran — Prinsip Kepemimpinan Pribadi',
    indices: [12, 13, 14],
  },
  {
    title: 'Kebiasaan 3: Dahulukan yang Utama — Prinsip Manajemen Pribadi',
    indices: [15, 16, 17],
  },
  {
    title: 'Bagian Tiga: Kemenangan Publik — Paradigma Saling Ketergantungan',
    indices: [18],
  },
  {
    title: 'Kebiasaan 4: Berpikir Menang-Menang — Prinsip Kepemimpinan Interpersonal',
    indices: [19, 20],
  },
  {
    title: 'Kebiasaan 5: Berusaha Memahami Dahulu, Baru Dipahami — Prinsip Komunikasi Empatis',
    indices: [21, 22, 23, 24],
  },
  {
    title: 'Kebiasaan 6: Wujudkan Sinergi — Prinsip Kerjasama Kreatif',
    indices: [25, 26, 27],
  },
  {
    title: 'Bagian Empat: Pembaruan — Kebiasaan 7: Mengasah Gergaji',
    indices: [28, 29, 30],
  },
  {
    title: 'Dari Dalam Keluar Lagi & Catatan Pribadi',
    indices: [31, 32, 33, 34],
  },
  {
    title: 'Penutup: Tanya & Jawab dengan Stephen R. Covey',
    indices: [35],
  },
  {
    title: 'Lampiran A: Hari Kuadran II di Kantor',
    indices: [36, 37],
  },
  {
    title: 'Lampiran B: Ayah yang Sangat Efektif',
    indices: [38],
  },
  {
    title: 'Tentang Penulis (Stephen R. Covey)',
    indices: [39],
  },
  {
    title: 'Indeks Masalah/Peluang & Indeks',
    indices: [40, 41],
  },
];

async function main() {
  console.log('Fetching existing chapters...');
  const res = await db.execute({
    sql: 'SELECT * FROM chapters WHERE book_id = ? ORDER BY order_index',
    args: [BOOK_ID],
  });

  console.log(`Fetched ${res.rows.length} chapters.`);
  if (res.rows.length !== 42) {
    console.error(`Expected 42 chapters, found ${res.rows.length}. Aborting.`);
    return;
  }

  const existing = res.rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    orderIndex: Number(r.order_index),
    content: JSON.parse(String(r.content)),
  }));

  const newChapters = [];
  let totalBlocks = 0;

  for (let gIdx = 0; gIdx < CHAPTER_GROUPS.length; gIdx++) {
    const group = CHAPTER_GROUPS[gIdx];
    const baseChapter = existing[group.indices[0]];
    const mergedBlocks = [...baseChapter.content];

    for (let i = 1; i < group.indices.length; i++) {
      const subIdx = group.indices[i];
      const subChapter = existing[subIdx];
      // Format the sub-chapter title nicely as a level 2 heading
      let subHeading = subChapter.title
        .replace(/—\s*WAWASAN BARU.*$/i, '')
        .trim();
      if (!subHeading || subHeading.length < 3) {
        subHeading = subChapter.title;
      }

      // Add a heading block for this section inside the chapter
      mergedBlocks.push({
        type: 'heading',
        text: subHeading,
        level: 2,
      });

      // Add all blocks from the sub-chapter
      mergedBlocks.push(...subChapter.content);
    }

    totalBlocks += mergedBlocks.length;
    newChapters.push({
      id: baseChapter.id,
      title: group.title,
      orderIndex: gIdx,
      content: mergedBlocks,
    });

    console.log(`${String(gIdx + 1).padStart(2, '0')}. ${group.title} (${mergedBlocks.length} blocks)`);
  }

  console.log(`\nTotal new chapters: ${newChapters.length}, total blocks: ${totalBlocks}`);

  // Now execute transaction: replace all chapters for this book
  console.log('\nExecuting update in Turso...');

  // 1. Delete all existing chapters for this book
  await db.execute({
    sql: 'DELETE FROM chapters WHERE book_id = ?',
    args: [BOOK_ID],
  });

  // 2. Insert new reorganized chapters
  for (const ch of newChapters) {
    await db.execute({
      sql: 'INSERT INTO chapters (id, book_id, title, order_index, content) VALUES (?, ?, ?, ?, ?)',
      args: [ch.id, BOOK_ID, ch.title, ch.orderIndex, JSON.stringify(ch.content)],
    });
  }

  // 3. Update books table total_chapters
  await db.execute({
    sql: 'UPDATE books SET total_chapters = ?, updated_at = ? WHERE id = ?',
    args: [newChapters.length, new Date().toISOString(), BOOK_ID],
  });

  console.log('Successfully reorganized book into 20 clean, complete chapters!');
}

main().catch(console.error);

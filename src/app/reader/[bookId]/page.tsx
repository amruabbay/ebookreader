import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getBookById, getAllBooks } from '@/lib/db/books';
import { getChaptersByBookId, getChapterNavItems } from '@/lib/db/chapters';
import { getProgressByBookId } from '@/lib/db/progress';
import { READER_COOKIE_NAME, DEFAULT_READER_ID } from '@/lib/reader-id';
import ReaderLayout from '@/components/reader/ReaderLayout';

export const dynamic = 'force-dynamic';

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;

  let book = await getBookById(bookId);
  if (!book || book.status !== 'ready') {
    // If user clicked classic-1 or a Sherlock reference, redirect to the real imported book
    if (bookId === 'classic-1' || bookId.toLowerCase().includes('sherlock')) {
      const allBooks = await getAllBooks();
      const sherlock = allBooks.find(
        (b) =>
          b.title.toLowerCase().includes('sherlock') ||
          b.author.toLowerCase().includes('conan doyle')
      );
      if (sherlock && sherlock.status === 'ready') {
        redirect(`/reader/${sherlock.id}`);
      }
    }

    notFound();
  }

  const cookieStore = await cookies();
  const readerId = cookieStore.get(READER_COOKIE_NAME)?.value || DEFAULT_READER_ID;

  const [chapters, navItems, progress] = await Promise.all([
    getChaptersByBookId(bookId),
    getChapterNavItems(bookId),
    getProgressByBookId(bookId, readerId),
  ]);

  if (chapters.length === 0) {
    if (book.viewMode === 'pdf-viewer') {
      const fallbackChapter = {
        id: `${book.id}-viewer`,
        bookId: book.id,
        title: 'Dokumen PDF',
        orderIndex: 0,
        content: [],
      };
      return (
        <ReaderLayout
          book={book}
          chapters={[fallbackChapter]}
          navItems={[{ id: fallbackChapter.id, title: 'Dokumen PDF', orderIndex: 0 }]}
          initialProgress={progress}
        />
      );
    }
    notFound();
  }

  return (
    <ReaderLayout
      book={book}
      chapters={chapters}
      navItems={navItems}
      initialProgress={progress}
    />
  );
}

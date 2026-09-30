'use client';

import BookCard from './BookCard';
import type { BookWithProgress } from '@/types';

interface BookGridProps {
  books: BookWithProgress[];
  onDelete?: (id: string) => void;
  className?: string;
}

export default function BookGrid({ books, onDelete, className = '' }: BookGridProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 ${className}`}>
      {books.map((book) => (
        <BookCard key={book.id} book={book} onDelete={onDelete} variant="grid" />
      ))}
    </div>
  );
}


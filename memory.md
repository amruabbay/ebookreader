# Personal Ebook Reader --- Project Memory

## 1. Project Overview

### Working Name

Personal Ebook Reader

### Product Concept

A web application for reading personal PDF ebooks in a more comfortable,
book-like reading experience.

The user uploads a PDF ebook into the application. Instead of displaying
the original PDF layout directly, the application extracts the text and
presents it in **Reflow Reading Mode**.

The main goal is:

> Upload → Process → Read → Highlight → Note → Bookmark → Search →
> Continue Reading

The application should feel closer to a modern ebook reader such as
Kindle, rather than a conventional PDF viewer.

------------------------------------------------------------------------

# 2. Main Problem

Reading PDF ebooks online can be inconvenient because:

-   PDF layouts are often designed for fixed paper dimensions.
-   Text size is difficult to customize.
-   Reading on laptops or smaller screens can require excessive zooming.
-   Navigation between chapters can be inconvenient.
-   Highlighting and note-taking may not feel natural.
-   Users may lose their reading position.
-   Searching within long books can be cumbersome.
-   Different PDF files can have inconsistent layouts.

The application solves this by converting the readable text from the PDF
into a flexible reading interface.

------------------------------------------------------------------------

# 3. Product Goal

Create a personal reading workspace that allows users to:

1.  Upload PDF ebooks.
2.  Extract and structure the content.
3.  Read books using reflowable text.
4.  Navigate chapters easily.
5.  Customize reading appearance.
6.  Highlight passages.
7.  Add notes.
8.  Bookmark important sections.
9.  Search the book.
10. Remember reading progress.
11. Organize a personal ebook library.

------------------------------------------------------------------------

# 4. Core Product Principle

## Reflow-First

The application should NOT behave primarily as a conventional PDF
viewer.

The PDF is treated as the **source document**.

The application extracts its readable content and transforms it into a
structured reading representation.

Conceptually:

``` text
PDF
 ↓
PDF Processing
 ↓
Text Extraction
 ↓
Content Cleaning
 ↓
Chapter Detection
 ↓
Paragraph / Heading Detection
 ↓
Structured Book
 ↓
Reflow Reader
```

The reader should be optimized for comfortable reading rather than
preserving the original PDF page layout.

------------------------------------------------------------------------

# 5. Important Reflow Behavior

The reading content should dynamically adapt to the available screen.

Example:

``` text
Desktop

Chapter 1
────────────

Lorem ipsum dolor sit amet, consectetur
adipiscing elit. Vestibulum...

        ↓ resize screen

Mobile

Chapter 1
────────

Lorem ipsum dolor sit
amet, consectetur
adipiscing elit.
```

The text should automatically wrap according to:

-   viewport width
-   reading width
-   font size
-   font family
-   line height
-   letter spacing
-   theme

There should be no dependency on the original PDF page width.

------------------------------------------------------------------------

# 6. Main Features

## 6.1 Personal Library

The dashboard contains all uploaded books.

Each book card should show:

-   Cover
-   Title
-   Author
-   Reading progress
-   Last read time
-   Reading status

Possible statuses:

-   Not Started
-   Reading
-   Completed

Actions:

-   Open
-   Rename
-   Delete
-   Favorite
-   Add to collection

Example:

``` text
My Library

[Book Cover]
The Laws of Human Nature
Robert Greene

67% completed

[Continue Reading]
```

------------------------------------------------------------------------

# 7. Upload PDF

Users can upload PDF files through:

-   Drag & drop
-   File picker

Upload flow:

``` text
Select PDF
   ↓
Upload
   ↓
Process Book
   ↓
Extract Text
   ↓
Detect Structure
   ↓
Generate Book Data
   ↓
Add to Library
```

During processing, show a clear state:

``` text
Processing your book...

Extracting text
██████████░░░░ 70%

Detecting chapters...
```

Possible processing states:

-   Uploading
-   Processing
-   Extracting text
-   Detecting chapters
-   Indexing search
-   Completed
-   Failed

------------------------------------------------------------------------

# 8. PDF Processing

The application needs a processing pipeline.

## Input

PDF file.

## Output

Structured book object.

Example:

``` json
{
  "title": "The Laws of Human Nature",
  "author": "Robert Greene",
  "chapters": [
    {
      "title": "Chapter 1",
      "content": [
        {
          "type": "paragraph",
          "text": "..."
        }
      ]
    }
  ]
}
```

Processing should attempt to detect:

-   Title
-   Author
-   Table of contents
-   Chapters
-   Sections
-   Headings
-   Paragraphs
-   Lists
-   Block quotes
-   Page references

The parser should preserve semantic structure where possible.

------------------------------------------------------------------------

# 9. Chapter Detection

The application should automatically detect chapters from the PDF.

Example:

``` text
Table of Contents

Introduction

Chapter 1
The Law of Irrationality

Chapter 2
The Law of Narcissism

Chapter 3
The Law of Role-Playing
```

Reader sidebar:

``` text
Contents

Introduction

01  The Law of Irrationality
02  The Law of Narcissism
03  The Law of Role-Playing
04  The Law of Compulsive Behavior
...
```

Clicking a chapter should scroll directly to that section.

If automatic chapter detection fails, future versions may allow manual
chapter editing.

------------------------------------------------------------------------

# 10. Reflow Reader

This is the main application screen.

Recommended structure:

``` text
┌─────────────────────────────────────────────┐
│ ← Library     Book Title          Aa  ⋮     │
├───────────────┬─────────────────────────────┤
│               │                             │
│ Contents      │       Chapter 1             │
│               │                             │
│ Introduction  │       The Law of...         │
│               │                             │
│ Chapter 1     │       Paragraph paragraph   │
│ Chapter 2     │       paragraph paragraph   │
│ Chapter 3     │                             │
│               │       Paragraph...          │
│               │                             │
└───────────────┴─────────────────────────────┘
```

The reading area should be centered and comfortable.

Recommended maximum reading width:

-   approximately 650--800px on desktop

This should be configurable.

------------------------------------------------------------------------

# 11. Reading Settings

The user should be able to customize the reading experience.

## Typography

Settings:

-   Font family
-   Font size
-   Line height
-   Letter spacing
-   Reading width

Suggested font sizes:

``` text
Small
Medium
Large
Extra Large
```

Possible font families:

-   Serif
-   Sans Serif
-   System
-   Dyslexia-friendly font (future)

Recommended default:

-   Serif font
-   Medium size
-   Relaxed line height

------------------------------------------------------------------------

# 12. Reading Themes

At minimum:

## Light

``` text
Background: White
Text: Dark
```

## Sepia

``` text
Background: Warm cream
Text: Dark brown
```

## Dark

``` text
Background: Dark gray
Text: Light
```

Future:

-   OLED Dark
-   Custom theme

The theme should affect the complete reader interface, not only the
text.

------------------------------------------------------------------------

# 13. Text Highlight

Users should be able to select text and highlight it.

Interaction:

``` text
Select text
     ↓
Highlight toolbar
     ↓
Choose color
     ↓
Save highlight
```

Possible highlight colors:

-   Yellow
-   Green
-   Blue
-   Pink

A highlight should store:

``` text
book_id
chapter_id
selected_text
text_position
color
created_at
```

Important:

The highlight should remain attached to the correct text even when font
size or screen width changes.

Therefore, highlighting should not rely only on pixel coordinates.

------------------------------------------------------------------------

# 14. Notes

Users can attach a note to highlighted text.

Example:

``` text
Highlighted text:

"People tend to..."

My Note:

Important concept for my thesis.
```

Data:

``` text
note_id
book_id
highlight_id
content
created_at
updated_at
```

Users should be able to:

-   Create note
-   Edit note
-   Delete note
-   View note
-   Navigate back to the highlighted passage

------------------------------------------------------------------------

# 15. Bookmark

Users can bookmark a reading position.

Example:

``` text
🔖 Bookmark

The Laws of Human Nature
Chapter 7
"The Law of Defensiveness"
```

A bookmark should store a stable content location rather than only a
visual page number.

Possible data:

``` text
bookmark_id
book_id
chapter_id
position
label
created_at
```

Optional future feature:

Allow users to add custom bookmark labels.

------------------------------------------------------------------------

# 16. Search

Search should work across the entire book.

Example:

``` text
Search in book...

"human nature"
```

Results:

``` text
3 results

Chapter 2
"...understanding human nature..."

Chapter 5
"...human nature is..."

Chapter 9
"...the darker side of human nature..."
```

Clicking a result should navigate directly to the matching text.

Search should support:

-   Exact text search
-   Case-insensitive search
-   Search result highlighting
-   Chapter name
-   Result context

Future:

-   Fuzzy search
-   Semantic search
-   Search across all books

------------------------------------------------------------------------

# 17. Reading Progress

The application should continuously save reading progress.

Example:

``` text
The Laws of Human Nature

Chapter 7
67% completed

██████████████░░░░░░
```

Store:

``` text
book_id
chapter_id
content_position
progress_percentage
last_read_at
```

When the user opens the book again:

``` text
Continue Reading

You stopped at:
Chapter 7 — The Law of Defensiveness

[Continue]
```

------------------------------------------------------------------------

# 18. Reading Statistics

Future feature.

Track:

-   Books started
-   Books completed
-   Reading time
-   Pages/content percentage completed
-   Highlights created
-   Notes created
-   Reading streak

Example:

``` text
Reading Statistics

Books completed       8
Currently reading     2
Highlights            143
Notes                  31

Reading this month
12h 42m
```

This should remain optional and should not make the application feel
gamified unless intentionally designed that way.

------------------------------------------------------------------------

# 19. Highlights & Notes Dashboard

A dedicated page for saved knowledge.

Example:

``` text
My Highlights

The Laws of Human Nature

🟡 Chapter 2
"People are generally..."

🟢 Chapter 5
"Never underestimate..."

🔵 Chapter 8
"Human beings tend to..."
```

Filters:

-   Book
-   Chapter
-   Highlight color
-   Date

Search:

``` text
Search highlights...
```

Notes should appear alongside their associated highlight.

------------------------------------------------------------------------

# 20. Keyboard Shortcuts

Desktop users should be able to use keyboard shortcuts.

Suggested:

  Shortcut   Action
  ---------- --------------------------
  ←          Previous section/page
  →          Next section/page
  F          Fullscreen
  T          Toggle Table of Contents
  S          Search
  B          Bookmark
  Esc        Close modal/sidebar
  \+         Increase font
  \-         Decrease font

Shortcuts should not interfere with normal text input.

------------------------------------------------------------------------

# 21. Fullscreen Reading

Reader should support distraction-free mode.

Normal:

``` text
Library
Sidebar
Reader controls
```

Fullscreen:

``` text
             Chapter 7

      The Law of Defensiveness

      Lorem ipsum dolor sit...
```

Controls can appear when the cursor moves or when the user taps/clicks.

------------------------------------------------------------------------

# 22. Responsive Design

The application should support:

-   Desktop
-   Laptop
-   Tablet
-   Mobile

Desktop:

``` text
Sidebar + Reading Area
```

Mobile:

``` text
Top Bar
   ↓
Reading Area
   ↓
Floating / bottom controls
```

The Table of Contents becomes a drawer on mobile.

------------------------------------------------------------------------

# 23. Information Architecture

Recommended application structure:

``` text
App
│
├── Dashboard
│   ├── Continue Reading
│   ├── Recent Books
│   ├── Library
│   └── Reading Statistics
│
├── Library
│   ├── All Books
│   ├── Reading
│   ├── Completed
│   ├── Favorites
│   └── Collections
│
├── Reader
│   ├── Contents
│   ├── Reading Area
│   ├── Search
│   ├── Highlights
│   ├── Notes
│   ├── Bookmarks
│   └── Reading Settings
│
├── Highlights
│
├── Notes
│
└── Settings
```

------------------------------------------------------------------------

# 24. Main User Flow

## First-time user

``` text
Landing / Dashboard
        ↓
Upload PDF
        ↓
Processing
        ↓
Book Added
        ↓
Open Book
        ↓
Reader
```

## Returning user

``` text
Dashboard
   ↓
Continue Reading
   ↓
Reader
   ↓
Last Position
```

## Highlight flow

``` text
Reader
  ↓
Select Text
  ↓
Highlight
  ↓
Choose Color
  ↓
Optional Note
  ↓
Save
```

## Search flow

``` text
Reader
  ↓
Search
  ↓
Enter keyword
  ↓
Search results
  ↓
Select result
  ↓
Jump to text
```

------------------------------------------------------------------------

# 25. Suggested Technical Architecture

High-level architecture:

``` text
Frontend
   ↓
Backend API
   ↓
PDF Processing Service
   ↓
Structured Book Data
   ↓
Database
   ↓
File Storage
```

Potential technology options:

## Frontend

Recommended:

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS

Alternative:

-   Vue / Nuxt

## Backend

Possible:

-   Next.js API routes
-   Node.js
-   Python FastAPI

Python can be particularly useful for PDF processing.

## PDF/Text Processing

Possible tools/libraries:

-   PyMuPDF
-   pdfplumber
-   pypdf
-   OCR for scanned PDFs

For scanned PDFs:

``` text
PDF
 ↓
OCR
 ↓
Text
 ↓
Structure Detection
 ↓
Reflow
```

OCR should be considered a separate processing path because not all PDFs
contain selectable text.

## Database

Possible:

-   PostgreSQL
-   SQLite for a simple local-first MVP

## File Storage

Possible:

-   Local storage for personal/local MVP
-   S3-compatible object storage
-   Supabase Storage

------------------------------------------------------------------------

# 26. Suggested Data Model

## User

``` text
User
- id
- email
- name
- created_at
```

## Book

``` text
Book
- id
- user_id
- title
- author
- cover_url
- original_file_url
- extracted_content
- total_characters
- status
- created_at
- updated_at
```

## Chapter

``` text
Chapter
- id
- book_id
- title
- order_index
- content
```

## Reading Progress

``` text
ReadingProgress
- id
- user_id
- book_id
- chapter_id
- content_position
- progress_percentage
- last_read_at
```

## Highlight

``` text
Highlight
- id
- user_id
- book_id
- chapter_id
- selected_text
- start_position
- end_position
- color
- created_at
```

## Note

``` text
Note
- id
- user_id
- book_id
- highlight_id
- content
- created_at
- updated_at
```

## Bookmark

``` text
Bookmark
- id
- user_id
- book_id
- chapter_id
- content_position
- label
- created_at
```

------------------------------------------------------------------------

# 27. Important Technical Consideration: Stable Text Anchoring

This is one of the most important technical requirements.

Because the reader is reflowable, the text position changes whenever:

-   Font size changes
-   Window size changes
-   Reading width changes
-   Font changes
-   Mobile/desktop layout changes

Therefore, highlights and bookmarks should NOT depend only on:

``` text
x = 240px
y = 520px
```

Instead, use text-based anchors.

Possible approach:

``` text
Book ID
+
Chapter ID
+
Text quote
+
Start/end character offset
```

Example:

``` json
{
  "chapter_id": "chapter-07",
  "quote": "Human beings tend to...",
  "start_offset": 3821,
  "end_offset": 3847
}
```

This allows annotations to survive reflow.

------------------------------------------------------------------------

# 28. Accessibility

The application should consider:

-   Keyboard navigation
-   Screen reader compatibility
-   Sufficient contrast
-   Adjustable text size
-   Focus states
-   Semantic HTML
-   Reduced motion option
-   Accessible buttons and labels

The reader should remain usable without relying entirely on mouse
interaction.

------------------------------------------------------------------------

# 29. Performance

Large books can contain hundreds of pages.

The application should avoid rendering the entire book as one huge DOM
tree.

Potential solution:

## Virtualized / paginated content

Instead of:

``` text
Render entire 600-page book
```

Use:

``` text
Load Chapter 1
      ↓
Load Chapter 2 when needed
      ↓
Unload distant content when appropriate
```

This is especially important for long books.

------------------------------------------------------------------------

# 30. Security & Privacy

Because users upload personal ebooks, privacy is important.

Requirements:

-   User authentication
-   Private book ownership
-   Authorization checks
-   Secure file storage
-   Do not expose uploaded files publicly
-   Validate uploaded file types
-   File size limits
-   Sanitize extracted HTML
-   Prevent malicious content injection
-   Secure API endpoints

If the application supports cloud storage, each user's files should be
isolated.

------------------------------------------------------------------------

# 31. MVP Scope

The first version should focus on the core reading experience.

## MVP V1

### Library

-   Upload PDF
-   View books
-   Delete books
-   Open book
-   Reading progress

### Processing

-   Extract PDF text
-   Detect chapters
-   Convert content into structured data

### Reader

-   Reflow text
-   Chapter navigation
-   Search
-   Fullscreen
-   Remember reading position

### Customization

-   Font size
-   Font family
-   Reading width
-   Line height
-   Light theme
-   Sepia theme
-   Dark theme

### Annotation

-   Highlight
-   Bookmark
-   Notes

This is enough for the first usable product.

------------------------------------------------------------------------

# 32. V2 Features

After the MVP is stable:

-   Highlights dashboard
-   Notes dashboard
-   Collections
-   Favorites
-   Reading statistics
-   More typography controls
-   Better chapter detection
-   OCR support
-   Export highlights
-   Export notes
-   Import/export book metadata
-   Mobile optimization
-   PWA support

------------------------------------------------------------------------

# 33. V3 / Advanced Features

Potential AI-powered reading workspace:

## AI Chapter Summary

``` text
Summarize this chapter
```

## Explain Selected Text

User highlights:

``` text
"The fundamental attribution error..."
```

Then:

``` text
Explain

This concept refers to...
```

## Ask the Book

``` text
Ask about this book...

"What are the main ideas from chapter 5?"
```

The AI should answer based on the uploaded book content.

## Semantic Search

Instead of searching exact words:

``` text
Why do people behave irrationally?
```

The application finds conceptually related passages.

## Cross-book Search

``` text
Search all books...

"human behavior"
```

Results from multiple books.

------------------------------------------------------------------------

# 34. Product Positioning

The application should not be positioned as:

> "A better PDF viewer."

Instead:

> **A personal reading workspace for your ebooks.**

Core value:

> Turn static PDF ebooks into a comfortable, searchable, customizable
> reading experience.

------------------------------------------------------------------------

# 35. UX Design Direction

The visual design should be:

-   Minimal
-   Calm
-   Book-focused
-   Distraction-free
-   Premium but simple

Avoid:

-   Excessive cards
-   Too many colors
-   Heavy shadows
-   Complicated navigation
-   Dashboard clutter

The reading screen should prioritize typography and content.

------------------------------------------------------------------------

# 36. Reader UI Priority

The hierarchy should be:

``` text
1. Content
2. Reading comfort
3. Navigation
4. Annotations
5. Settings
```

Controls should stay visually secondary to the book content.

------------------------------------------------------------------------

# 37. Recommended Reader Layout

Desktop:

``` text
┌───────────────────────────────────────────────────────┐
│ ← Library     The Laws of Human Nature        Aa  ⋯ │
├───────────────┬───────────────────────────────────────┤
│               │                                       │
│ CONTENTS      │            CHAPTER 7                  │
│               │                                       │
│ Introduction  │     The Law of Defensiveness         │
│               │                                       │
│ Chapter 1     │     Paragraph paragraph paragraph     │
│ Chapter 2     │     paragraph paragraph paragraph     │
│ Chapter 3     │                                       │
│ Chapter 4     │     Paragraph paragraph paragraph     │
│               │                                       │
│               │                                       │
└───────────────┴───────────────────────────────────────┘
```

Reader width should remain comfortable even on large monitors.

------------------------------------------------------------------------

# 38. Settings Drawer

Suggested interaction:

``` text
Aa

Reading Settings

Font
[ Serif ▼ ]

Size
−   A   +

Line Height
──────●────

Reading Width
──────●────

Theme

○ Light
○ Sepia
● Dark
```

Changes should be applied immediately.

------------------------------------------------------------------------

# 39. Annotation UX

When text is selected:

``` text
             ┌──────────────────────┐
             │ 🟡 🟢 🔵 🩷  📝      │
             └──────────────────────┘
                      ↑
                 selected text
```

Actions:

-   Highlight
-   Add note
-   Copy
-   Search
-   Ask AI (future)

------------------------------------------------------------------------

# 40. Search UX

Search should appear as a lightweight overlay or sidebar.

``` text
Search in book

┌───────────────────────────────┐
│ human nature              🔍  │
└───────────────────────────────┘

3 results

Chapter 2
"...human nature..."

Chapter 5
"...understanding human..."

Chapter 9
"...human behavior..."
```

Selecting a result should:

1.  Navigate to the correct chapter.
2.  Scroll to the text.
3.  Temporarily emphasize the matching text.

------------------------------------------------------------------------

# 41. Empty States

Important empty states:

## No books

``` text
Your library is empty.

Upload your first ebook
and start reading.

[ Upload PDF ]
```

## No highlights

``` text
No highlights yet.

Highlight important passages
while you read.
```

## No bookmarks

``` text
No bookmarks yet.

Bookmark passages you want
to return to later.
```

------------------------------------------------------------------------

# 42. Error States

Examples:

## Unsupported PDF

``` text
We couldn't process this PDF.

The file may be corrupted or unsupported.
Try another PDF.
```

## Scanned PDF

``` text
This book appears to contain scanned pages.

OCR processing is required to make the text readable.
```

## Processing failed

``` text
Something went wrong while processing your book.

[ Try Again ]
```

------------------------------------------------------------------------

# 43. Future Local-First Direction

Because the application is intended for personal ebook reading, a
local-first architecture could eventually be considered.

Possible architecture:

``` text
Browser
 ↓
Local File Storage
 ↓
Local Processing
 ↓
IndexedDB
```

Benefits:

-   Better privacy
-   No cloud upload required
-   Offline reading
-   Faster access
-   Lower infrastructure cost

However, cloud synchronization can be added later.

------------------------------------------------------------------------

# 44. Product Success Criteria

The MVP should be considered successful if a user can:

1.  Upload a PDF.
2.  Open it within the application.
3.  Read the entire book in reflow mode.
4.  Navigate chapters.
5.  Change font size.
6.  Change theme.
7.  Search the book.
8.  Highlight text.
9.  Add notes.
10. Bookmark a location.
11. Close the application.
12. Reopen the book and continue from the previous position.

The experience should feel significantly more comfortable than reading
the original PDF directly.

------------------------------------------------------------------------

# 45. Development Priority

Recommended order:

``` text
Phase 1
PDF Upload
↓
PDF Text Extraction
↓
Basic Reflow Reader

Phase 2
Chapter Detection
↓
Library
↓
Reading Progress

Phase 3
Typography Settings
↓
Themes
↓
Search

Phase 4
Highlight
↓
Bookmark
↓
Notes

Phase 5
Performance
↓
Accessibility
↓
Responsive Design

Phase 6
AI Features
```

Do not start with AI.

The fundamental reading experience should be stable first.

------------------------------------------------------------------------

# 46. One-Sentence Product Definition

> A personal web-based ebook reader that transforms uploaded PDF books
> into a customizable reflowable reading experience with chapters,
> search, highlights, notes, bookmarks, and persistent reading progress.

------------------------------------------------------------------------

# 47. Design Philosophy

The application should answer one question:

> "How can I make reading my own ebooks as comfortable as possible?"

Every feature should support that goal.

The reader should feel:

**Simple → Comfortable → Focused → Personal → Useful**

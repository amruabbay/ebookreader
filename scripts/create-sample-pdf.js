const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createSamplePdf() {
  const doc = await PDFDocument.create();
  const timesFont = await doc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  // Title page
  const titlePage = doc.addPage([612, 792]);
  titlePage.drawText('The Art of Reading', { x: 150, y: 500, font: timesBold, size: 28, color: rgb(0.1, 0.1, 0.1) });
  titlePage.drawText('by Sample Author', { x: 200, y: 460, font: timesFont, size: 16, color: rgb(0.3, 0.3, 0.3) });

  // Chapter 1
  const ch1p1 = doc.addPage([612, 792]);
  ch1p1.drawText('Chapter 1', { x: 72, y: 700, font: timesBold, size: 24, color: rgb(0.1, 0.1, 0.1) });
  ch1p1.drawText('The Beginning of Knowledge', { x: 72, y: 665, font: timesBold, size: 18, color: rgb(0.2, 0.2, 0.2) });

  const ch1text = [
    'Reading is one of the most transformative activities a human being can engage in.',
    'Through books, we gain access to the accumulated wisdom of centuries, the thoughts',
    'of brilliant minds, and the experiences of people from all walks of life.',
    '',
    'The act of reading requires concentration, patience, and an open mind. When we read',
    'deeply, we enter a state of flow that is both relaxing and intellectually stimulating.',
    'This paradox—that deep focus can lead to relaxation—is one of the great pleasures of',
    'the reading experience.',
    '',
    'In this book, we will explore the many dimensions of reading: its history, its cognitive',
    'benefits, its role in shaping culture, and practical strategies for becoming a more',
    'effective and engaged reader.',
  ];

  let y = 620;
  for (const line of ch1text) {
    if (line === '') { y -= 15; continue; }
    ch1p1.drawText(line, { x: 72, y, font: timesFont, size: 12, color: rgb(0.15, 0.15, 0.15) });
    y -= 18;
  }

  // Chapter 2
  const ch2p1 = doc.addPage([612, 792]);
  ch2p1.drawText('Chapter 2', { x: 72, y: 700, font: timesBold, size: 24, color: rgb(0.1, 0.1, 0.1) });
  ch2p1.drawText('The History of the Written Word', { x: 72, y: 665, font: timesBold, size: 18, color: rgb(0.2, 0.2, 0.2) });

  const ch2text = [
    'The invention of writing is perhaps the most significant technological achievement in',
    'human history. Before writing, knowledge could only be transmitted orally, from person',
    'to person, generation to generation. Writing changed everything.',
    '',
    'The earliest known writing systems emerged in Mesopotamia around 3400 BCE. These',
    'cuneiform tablets recorded everything from grain inventories to epic poetry. The Epic',
    'of Gilgamesh, one of the oldest surviving works of literature, tells us that even five',
    'thousand years ago, humans grappled with questions of mortality, friendship, and meaning.',
    '',
    'The development of the alphabet simplified writing dramatically. Instead of thousands',
    'of pictographic characters, a small set of symbols could represent all the sounds of',
    'a language. This democratized literacy and made books possible.',
  ];

  y = 620;
  for (const line of ch2text) {
    if (line === '') { y -= 15; continue; }
    ch2p1.drawText(line, { x: 72, y, font: timesFont, size: 12, color: rgb(0.15, 0.15, 0.15) });
    y -= 18;
  }

  // Chapter 3
  const ch3p1 = doc.addPage([612, 792]);
  ch3p1.drawText('Chapter 3', { x: 72, y: 700, font: timesBold, size: 24, color: rgb(0.1, 0.1, 0.1) });
  ch3p1.drawText('The Cognitive Benefits of Reading', { x: 72, y: 665, font: timesBold, size: 18, color: rgb(0.2, 0.2, 0.2) });

  const ch3text = [
    'Modern neuroscience has revealed that reading profoundly shapes the brain. When we read,',
    'multiple brain regions activate simultaneously: language processing areas interpret the',
    'words, visual cortex processes the letters, and higher-order thinking regions construct',
    'meaning from the text.',
    '',
    'Studies have shown that regular reading strengthens neural connections, improves memory,',
    'enhances empathy, and even delays cognitive decline in aging. Reading fiction, in particular,',
    'has been linked to improved theory of mind—the ability to understand others perspectives.',
    '',
    'Perhaps most remarkably, the brain does not distinguish sharply between reading about an',
    'experience and actually having that experience. When you read about a character walking',
    'through a forest, your motor cortex and sensory regions activate as if you were there.',
  ];

  y = 620;
  for (const line of ch3text) {
    if (line === '') { y -= 15; continue; }
    ch3p1.drawText(line, { x: 72, y, font: timesFont, size: 12, color: rgb(0.15, 0.15, 0.15) });
    y -= 18;
  }

  const pdfBytes = await doc.save();

  // Save to a known location
  const outPath = path.join(__dirname, '..', 'test-book.pdf');
  fs.writeFileSync(outPath, pdfBytes);
  console.log('Created sample PDF at:', outPath);
}

createSamplePdf().catch(console.error);

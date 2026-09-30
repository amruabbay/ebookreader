import { NextRequest } from 'next/server';
import { buildCoverUrl, buildEpubCandidateUrls } from '@/lib/gutenberg';

export const dynamic = 'force-dynamic';

interface CacheEntry {
  timestamp: number;
  data: unknown;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CuratedBook {
  id: number;
  title: string;
  author: string;
  coverUrl: string;
  subjects: string[];
  category: string;
  downloadCount: number;
  epubUrl: string;
  language?: string;
}

// Category keyword mappings for aliases and resilient subject matching
const CATEGORY_MAP: Record<string, { aliases: string[]; searchKeywords: string[]; label: string }> = {
  anthropology: {
    label: 'Antropologi',
    aliases: ['anthropology', 'ethnology', 'customs', 'folklore', 'mythology', 'culture', 'primitive'],
    searchKeywords: ['anthropology', 'golden bough', 'primitive culture', 'descent of man'],
  },
  astronomy: {
    label: 'Astronomi',
    aliases: ['astronomy', 'astrophysics', 'heavens', 'stars', 'cosmos', 'planet', 'mars', 'orbit', 'solar system', 'celestial'],
    searchKeywords: ['astronomy', 'heavens', 'cosmos', 'stars'],
  },
  biology: {
    label: 'Biologi',
    aliases: ['biology', 'natural history', 'evolution', 'species', 'darwin', 'botany', 'zoology', 'cell', 'anatomy'],
    searchKeywords: ['biology', 'origin of species', 'evolution', 'natural history'],
  },
  psychology: {
    label: 'Psikologi',
    aliases: ['psychology', 'psychological', 'psychoanalysis', 'subconscious', 'freud', 'mind', 'behavior', 'cognition', 'dreams'],
    searchKeywords: ['psychology', 'psychoanalysis', 'freud', 'behavior'],
  },
  philosophy: {
    label: 'Filsafat',
    aliases: ['philosophy', 'ethics', 'logic', 'stoic', 'epistemology', 'metaphysics', 'nietzsche', 'plato', 'kant', 'marcus aurelius', 'moral', 'justice'],
    searchKeywords: ['philosophy', 'ethics', 'meditations', 'republic', 'nietzsche'],
  },
  history: {
    label: 'Sejarah',
    aliases: ['history', 'historical', 'civilization', 'revolution', 'empire', 'antiquity', 'ancient', 'roman', 'greece', 'war'],
    searchKeywords: ['history', 'civilization', 'empire', 'ancient'],
  },
  fiction: {
    label: 'Fiksi Klasik',
    aliases: ['fiction', 'classic literature', 'novel', 'stories', 'gothic', 'drama', 'tales'],
    searchKeywords: ['fiction', 'novel', 'classic literature'],
  },
  adventure: {
    label: 'Petualangan',
    aliases: ['adventure', 'sea stories', 'voyages', 'pirates', 'treasure', 'island', 'travel', 'expedition'],
    searchKeywords: ['adventure', 'treasure island', 'voyage', 'sea stories'],
  },
  science: {
    label: 'Sains',
    aliases: ['science', 'astronomy', 'biology', 'physics', 'naturalist', 'cosmos', 'scientific'],
    searchKeywords: ['science', 'astronomy', 'biology', 'physics'],
  },
  technology: {
    label: 'Teknologi',
    aliases: ['technology', 'engineering', 'invention', 'machines', 'science fiction', 'industrial'],
    searchKeywords: ['technology', 'invention', 'machinery', 'science'],
  },
};

// Rich curated classics covering ALL categories guaranteed
const CURATED_CLASSICS: CuratedBook[] = [
  // ================= ANTROPOLOGI =================
  {
    id: 4180,
    title: 'The Golden Bough: A Study in Magic and Religion',
    author: 'James George Frazer',
    coverUrl: buildCoverUrl(4180),
    subjects: ['Anthropology', 'Magic and Religion', 'Mythology and Folklore', 'anthropology'],
    category: 'anthropology',
    downloadCount: 48500,
    epubUrl: buildEpubCandidateUrls(4180)[0],
  },
  {
    id: 2300,
    title: 'The Descent of Man, and Selection in Relation to Sex',
    author: 'Charles Darwin',
    coverUrl: buildCoverUrl(2300),
    subjects: ['Anthropology', 'Human Evolution', 'Natural Selection', 'anthropology', 'biology'],
    category: 'anthropology',
    downloadCount: 52100,
    epubUrl: buildEpubCandidateUrls(2300)[0],
  },
  {
    id: 52914,
    title: 'Primitive Culture: Researches into Mythology, Religion and Custom',
    author: 'Edward Burnett Tylor',
    coverUrl: buildCoverUrl(52914),
    subjects: ['Anthropology', 'Culture and Civilization', 'Social Sciences', 'anthropology'],
    category: 'anthropology',
    downloadCount: 28400,
    epubUrl: buildEpubCandidateUrls(52914)[0],
  },
  {
    id: 1448,
    title: 'Custom and Myth',
    author: 'Andrew Lang',
    coverUrl: buildCoverUrl(1448),
    subjects: ['Anthropology', 'Comparative Mythology', 'Manners and Customs', 'anthropology'],
    category: 'anthropology',
    downloadCount: 19200,
    epubUrl: buildEpubCandidateUrls(1448)[0],
  },
  {
    id: 3623,
    title: 'Folk-Lore in the Old Testament: Studies in Comparative Religion',
    author: 'James George Frazer',
    coverUrl: buildCoverUrl(3623),
    subjects: ['Anthropology', 'Folklore and Traditions', 'Ancient Customs', 'anthropology'],
    category: 'anthropology',
    downloadCount: 21300,
    epubUrl: buildEpubCandidateUrls(3623)[0],
  },

  // ================= ASTRONOMI =================
  {
    id: 15309,
    title: 'Astronomy for Everybody: The Wonders of the Heavens',
    author: 'Simon Newcomb',
    coverUrl: buildCoverUrl(15309),
    subjects: ['Astronomy', 'Stars and Planets', 'Popular Science', 'astronomy', 'science'],
    category: 'astronomy',
    downloadCount: 41200,
    epubUrl: buildEpubCandidateUrls(15309)[0],
  },
  {
    id: 44026,
    title: 'The Story of the Heavens',
    author: 'Sir Robert Stawell Ball',
    coverUrl: buildCoverUrl(44026),
    subjects: ['Astronomy', 'Solar System', 'Celestial Mechanics', 'astronomy', 'science'],
    category: 'astronomy',
    downloadCount: 36700,
    epubUrl: buildEpubCandidateUrls(44026)[0],
  },
  {
    id: 49716,
    title: 'Space, Time and Gravitation: An Outline of Relativity',
    author: 'Sir Arthur Stanley Eddington',
    coverUrl: buildCoverUrl(49716),
    subjects: ['Astronomy', 'Astrophysics & Relativity', 'Cosmology', 'astronomy', 'science'],
    category: 'astronomy',
    downloadCount: 38900,
    epubUrl: buildEpubCandidateUrls(49716)[0],
  },
  {
    id: 41653,
    title: 'Mars and Its Canals',
    author: 'Percival Lowell',
    coverUrl: buildCoverUrl(41653),
    subjects: ['Astronomy', 'Mars', 'Planetary Science', 'astronomy'],
    category: 'astronomy',
    downloadCount: 27500,
    epubUrl: buildEpubCandidateUrls(41653)[0],
  },
  {
    id: 23681,
    title: 'In the High Heavens',
    author: 'Sir Robert Stawell Ball',
    coverUrl: buildCoverUrl(23681),
    subjects: ['Astronomy', 'Comets & Meteorites', 'The Universe', 'astronomy', 'science'],
    category: 'astronomy',
    downloadCount: 24600,
    epubUrl: buildEpubCandidateUrls(23681)[0],
  },
  {
    id: 48606,
    title: 'Popular Astronomy: A General Description of the Heavens',
    author: 'Camille Flammarion',
    coverUrl: buildCoverUrl(48606),
    subjects: ['Astronomy', 'Observational Cosmos', 'Wonders of Space', 'astronomy', 'science'],
    category: 'astronomy',
    downloadCount: 22100,
    epubUrl: buildEpubCandidateUrls(48606)[0],
  },

  // ================= BIOLOGI =================
  {
    id: 1228,
    title: 'On the Origin of Species',
    author: 'Charles Darwin',
    coverUrl: buildCoverUrl(1228),
    subjects: ['Biology', 'Evolution by Natural Selection', 'Natural History', 'biology', 'science'],
    category: 'biology',
    downloadCount: 125000,
    epubUrl: buildEpubCandidateUrls(1228)[0],
  },
  {
    id: 3704,
    title: 'The Voyage of the Beagle',
    author: 'Charles Darwin',
    coverUrl: buildCoverUrl(3704),
    subjects: ['Biology', 'Natural History', 'South America & Galapagos', 'biology', 'adventure'],
    category: 'biology',
    downloadCount: 68400,
    epubUrl: buildEpubCandidateUrls(3704)[0],
  },
  {
    id: 2931,
    title: "Evidence as to Man's Place in Nature",
    author: 'Thomas Henry Huxley',
    coverUrl: buildCoverUrl(2931),
    subjects: ['Biology', 'Evolutionary Biology', 'Comparative Anatomy', 'biology', 'anthropology'],
    category: 'biology',
    downloadCount: 31200,
    epubUrl: buildEpubCandidateUrls(2931)[0],
  },
  {
    id: 5184,
    title: 'The Expression of the Emotions in Man and Animals',
    author: 'Charles Darwin',
    coverUrl: buildCoverUrl(5184),
    subjects: ['Biology', 'Animal Behavior', 'Evolutionary Psychology', 'biology', 'psychology'],
    category: 'biology',
    downloadCount: 39400,
    epubUrl: buildEpubCandidateUrls(5184)[0],
  },
  {
    id: 24419,
    title: 'The Cell in Development and Inheritance',
    author: 'Edmund Beecher Wilson',
    coverUrl: buildCoverUrl(24419),
    subjects: ['Biology', 'Cellular Biology', 'Genetics and Life', 'biology', 'science'],
    category: 'biology',
    downloadCount: 21800,
    epubUrl: buildEpubCandidateUrls(24419)[0],
  },

  // ================= PSIKOLOGI =================
  {
    id: 4349,
    title: 'The Interpretation of Dreams',
    author: 'Sigmund Freud',
    coverUrl: buildCoverUrl(4349),
    subjects: ['Psychology', 'Psychoanalysis', 'Dream Interpretation', 'psychology'],
    category: 'psychology',
    downloadCount: 96300,
    epubUrl: buildEpubCandidateUrls(4349)[0],
  },
  {
    id: 38219,
    title: 'A General Introduction to Psychoanalysis',
    author: 'Sigmund Freud',
    coverUrl: buildCoverUrl(38219),
    subjects: ['Psychology', 'Psychoanalysis', 'Human Behavior', 'psychology'],
    category: 'psychology',
    downloadCount: 54100,
    epubUrl: buildEpubCandidateUrls(38219)[0],
  },
  {
    id: 35086,
    title: 'Psychopathology of Everyday Life',
    author: 'Sigmund Freud',
    coverUrl: buildCoverUrl(35086),
    subjects: ['Psychology', 'Subconscious Mind', 'Memory and Forgetting', 'psychology'],
    category: 'psychology',
    downloadCount: 47800,
    epubUrl: buildEpubCandidateUrls(35086)[0],
  },
  {
    id: 5827,
    title: 'The Principles of Psychology',
    author: 'William James',
    coverUrl: buildCoverUrl(5827),
    subjects: ['Psychology', 'Cognition & Consciousness', 'Philosophy of Mind', 'psychology', 'philosophy'],
    category: 'psychology',
    downloadCount: 43200,
    epubUrl: buildEpubCandidateUrls(5827)[0],
  },
  {
    id: 445,
    title: 'The Crowd: A Study of the Popular Mind',
    author: 'Gustave Le Bon',
    coverUrl: buildCoverUrl(445),
    subjects: ['Psychology', 'Social Psychology', 'Crowd Behavior', 'psychology'],
    category: 'psychology',
    downloadCount: 58900,
    epubUrl: buildEpubCandidateUrls(445)[0],
  },
  {
    id: 44521,
    title: 'Psychology of the Unconscious',
    author: 'Carl Gustav Jung',
    coverUrl: buildCoverUrl(44521),
    subjects: ['Psychology', 'Analytical Psychology', 'Archetypes & Unconscious', 'psychology'],
    category: 'psychology',
    downloadCount: 49700,
    epubUrl: buildEpubCandidateUrls(44521)[0],
  },

  // ================= FILSAFAT =================
  {
    id: 1497,
    title: 'The Republic',
    author: 'Plato',
    coverUrl: buildCoverUrl(1497),
    subjects: ['Philosophy', 'Political science', 'Justice and Ethics', 'philosophy', 'history'],
    category: 'philosophy',
    downloadCount: 62400,
    epubUrl: buildEpubCandidateUrls(1497)[0],
  },
  {
    id: 2680,
    title: 'Meditations',
    author: 'Marcus Aurelius',
    coverUrl: buildCoverUrl(2680),
    subjects: ['Stoics', 'Philosophy', 'Ethics and Mind', 'philosophy'],
    category: 'philosophy',
    downloadCount: 45300,
    epubUrl: buildEpubCandidateUrls(2680)[0],
  },
  {
    id: 4363,
    title: 'Beyond Good and Evil',
    author: 'Friedrich Nietzsche',
    coverUrl: buildCoverUrl(4363),
    subjects: ['Philosophy', 'Modern Thought', 'Ethics & Morals', 'philosophy'],
    category: 'philosophy',
    downloadCount: 87400,
    epubUrl: buildEpubCandidateUrls(4363)[0],
  },
  {
    id: 1998,
    title: 'Thus Spake Zarathustra',
    author: 'Friedrich Nietzsche',
    coverUrl: buildCoverUrl(1998),
    subjects: ['Philosophy', 'Existentialism', 'Classic Philosophy', 'philosophy'],
    category: 'philosophy',
    downloadCount: 84100,
    epubUrl: buildEpubCandidateUrls(1998)[0],
  },
  {
    id: 5683,
    title: 'The Art of War',
    author: 'Sun Tzu',
    coverUrl: buildCoverUrl(5683),
    subjects: ['Military Strategy', 'Strategy & Tactics', 'Eastern Philosophy', 'philosophy', 'history'],
    category: 'philosophy',
    downloadCount: 91200,
    epubUrl: buildEpubCandidateUrls(5683)[0],
  },
  {
    id: 1232,
    title: 'The Prince',
    author: 'Niccolò Machiavelli',
    coverUrl: buildCoverUrl(1232),
    subjects: ['Political science', 'Statecraft', 'Philosophy', 'history', 'philosophy'],
    category: 'philosophy',
    downloadCount: 43200,
    epubUrl: buildEpubCandidateUrls(1232)[0],
  },
  {
    id: 4280,
    title: 'The Critique of Pure Reason',
    author: 'Immanuel Kant',
    coverUrl: buildCoverUrl(4280),
    subjects: ['Philosophy', 'Epistemology', 'Reason and Logic', 'philosophy'],
    category: 'philosophy',
    downloadCount: 48600,
    epubUrl: buildEpubCandidateUrls(4280)[0],
  },
  {
    id: 28054,
    title: 'The Brothers Karamazov',
    author: 'Fyodor Dostoyevsky',
    coverUrl: buildCoverUrl(28054),
    subjects: ['Brothers -- Fiction', 'Fathers and sons', 'Philosophy of Faith', 'philosophy'],
    category: 'philosophy',
    downloadCount: 32600,
    epubUrl: buildEpubCandidateUrls(28054)[0],
  },
  {
    id: 5200,
    title: 'Metamorphosis',
    author: 'Franz Kafka',
    coverUrl: buildCoverUrl(5200),
    subjects: ['Psychological fiction', 'Metamorphosis', 'Existential Literature', 'philosophy'],
    category: 'philosophy',
    downloadCount: 72100,
    epubUrl: buildEpubCandidateUrls(5200)[0],
  },
  {
    id: 174,
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    coverUrl: buildCoverUrl(174),
    subjects: ['Supernatural -- Fiction', 'Psychological fiction', 'London -- Fiction', 'philosophy'],
    category: 'philosophy',
    downloadCount: 76200,
    epubUrl: buildEpubCandidateUrls(174)[0],
  },

  // ================= SEJARAH =================
  {
    id: 1080,
    title: 'A Short History of the World',
    author: 'H. G. Wells',
    coverUrl: buildCoverUrl(1080),
    subjects: ['World History', 'Civilization', 'Ancient to Modern Times', 'history'],
    category: 'history',
    downloadCount: 45200,
    epubUrl: buildEpubCandidateUrls(1080)[0],
  },
  {
    id: 8800,
    title: 'The Decline and Fall of the Roman Empire',
    author: 'Edward Gibbon',
    coverUrl: buildCoverUrl(8800),
    subjects: ['Roman History', 'Ancient Rome', 'Empire and Civilization', 'history'],
    category: 'history',
    downloadCount: 48100,
    epubUrl: buildEpubCandidateUrls(8800)[0],
  },
  {
    id: 2130,
    title: 'The History of Herodotus',
    author: 'Herodotus',
    coverUrl: buildCoverUrl(2130),
    subjects: ['Ancient Greece', 'Persian Wars', 'Antiquity and Culture', 'history'],
    category: 'history',
    downloadCount: 39500,
    epubUrl: buildEpubCandidateUrls(2130)[0],
  },
  {
    id: 2600,
    title: 'War and Peace',
    author: 'Leo Tolstoy',
    coverUrl: buildCoverUrl(2600),
    subjects: ['Historical fiction', 'Russia -- History', 'Napoleonic Wars', 'history'],
    category: 'history',
    downloadCount: 59100,
    epubUrl: buildEpubCandidateUrls(2600)[0],
  },
  {
    id: 98,
    title: 'A Tale of Two Cities',
    author: 'Charles Dickens',
    coverUrl: buildCoverUrl(98),
    subjects: ['Historical fiction', 'French Revolution', 'London and Paris', 'history'],
    category: 'history',
    downloadCount: 78500,
    epubUrl: buildEpubCandidateUrls(98)[0],
  },
  {
    id: 1727,
    title: 'The Odyssey',
    author: 'Homer',
    coverUrl: buildCoverUrl(1727),
    subjects: ['Epic poetry', 'Odysseus', 'Ancient Greece', 'history', 'adventure'],
    category: 'history',
    downloadCount: 34900,
    epubUrl: buildEpubCandidateUrls(1727)[0],
  },

  // ================= FIKSI KLASIK =================
  {
    id: 1342,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    coverUrl: buildCoverUrl(1342),
    subjects: ['Courtship -- Fiction', 'Classic Literature', 'England -- Social life', 'fiction'],
    category: 'fiction',
    downloadCount: 154200,
    epubUrl: buildEpubCandidateUrls(1342)[0],
  },
  {
    id: 84,
    title: 'Frankenstein; Or, The Modern Prometheus',
    author: 'Mary Wollstonecraft Shelley',
    coverUrl: buildCoverUrl(84),
    subjects: ['Science fiction', 'Monsters -- Fiction', 'Gothic fiction', 'fiction'],
    category: 'fiction',
    downloadCount: 142100,
    epubUrl: buildEpubCandidateUrls(84)[0],
  },
  {
    id: 64317,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    coverUrl: buildCoverUrl(64317),
    subjects: ['Rich people -- Fiction', 'Jazz Age', 'Long Island -- Fiction', 'fiction'],
    category: 'fiction',
    downloadCount: 68900,
    epubUrl: buildEpubCandidateUrls(64317)[0],
  },
  {
    id: 1260,
    title: 'Jane Eyre: An Autobiography',
    author: 'Charlotte Brontë',
    coverUrl: buildCoverUrl(1260),
    subjects: ['Governesses -- Fiction', 'Gothic fiction', 'Love stories', 'fiction'],
    category: 'fiction',
    downloadCount: 39800,
    epubUrl: buildEpubCandidateUrls(1260)[0],
  },
  {
    id: 768,
    title: 'Wuthering Heights',
    author: 'Emily Brontë',
    coverUrl: buildCoverUrl(768),
    subjects: ['Revenge -- Fiction', 'Yorkshire -- Fiction', 'Gothic fiction', 'fiction'],
    category: 'fiction',
    downloadCount: 38200,
    epubUrl: buildEpubCandidateUrls(768)[0],
  },
  {
    id: 514,
    title: 'Little Women',
    author: 'Louisa May Alcott',
    coverUrl: buildCoverUrl(514),
    subjects: ['Sisters -- Fiction', 'Family life -- Fiction', 'Classic Literature', 'fiction'],
    category: 'fiction',
    downloadCount: 37400,
    epubUrl: buildEpubCandidateUrls(514)[0],
  },
  {
    id: 1400,
    title: 'Great Expectations',
    author: 'Charles Dickens',
    coverUrl: buildCoverUrl(1400),
    subjects: ['Orphans -- Fiction', 'London -- Fiction', 'Classic Fiction', 'fiction'],
    category: 'fiction',
    downloadCount: 33700,
    epubUrl: buildEpubCandidateUrls(1400)[0],
  },
  {
    id: 2554,
    title: 'Crime and Punishment',
    author: 'Fyodor Dostoyevsky',
    coverUrl: buildCoverUrl(2554),
    subjects: ['Psychological fiction', 'Murder -- Fiction', 'Saint Petersburg', 'fiction', 'philosophy'],
    category: 'fiction',
    downloadCount: 54300,
    epubUrl: buildEpubCandidateUrls(2554)[0],
  },

  // ================= PETUALANGAN =================
  {
    id: 120,
    title: 'Treasure Island',
    author: 'Robert Louis Stevenson',
    coverUrl: buildCoverUrl(120),
    subjects: ['Pirates -- Fiction', 'Treasure troves', 'Adventure stories', 'adventure'],
    category: 'adventure',
    downloadCount: 47200,
    epubUrl: buildEpubCandidateUrls(120)[0],
  },
  {
    id: 2701,
    title: 'Moby Dick; Or, The Whale',
    author: 'Herman Melville',
    coverUrl: buildCoverUrl(2701),
    subjects: ['Whaling -- Fiction', 'Sea stories', 'Adventure', 'adventure'],
    category: 'adventure',
    downloadCount: 98300,
    epubUrl: buildEpubCandidateUrls(2701)[0],
  },
  {
    id: 1661,
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    coverUrl: buildCoverUrl(1661),
    subjects: ['Detective and mystery stories', 'Sherlock Holmes', 'Classic Fiction', 'adventure', 'mystery'],
    category: 'adventure',
    downloadCount: 119800,
    epubUrl: buildEpubCandidateUrls(1661)[0],
  },
  {
    id: 345,
    title: 'Dracula',
    author: 'Bram Stoker',
    coverUrl: buildCoverUrl(345),
    subjects: ['Vampires -- Fiction', 'Horror', 'Gothic fiction', 'adventure'],
    category: 'adventure',
    downloadCount: 84300,
    epubUrl: buildEpubCandidateUrls(345)[0],
  },
  {
    id: 11,
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    coverUrl: buildCoverUrl(11),
    subjects: ['Fantasy', "Children's stories", 'Classics', 'adventure'],
    category: 'adventure',
    downloadCount: 89400,
    epubUrl: buildEpubCandidateUrls(11)[0],
  },
  {
    id: 35,
    title: 'The Time Machine',
    author: 'H. G. Wells',
    coverUrl: buildCoverUrl(35),
    subjects: ['Science fiction', 'Time travel -- Fiction', 'Dystopias', 'adventure'],
    category: 'adventure',
    downloadCount: 51200,
    epubUrl: buildEpubCandidateUrls(35)[0],
  },
  {
    id: 36,
    title: 'The War of the Worlds',
    author: 'H. G. Wells',
    coverUrl: buildCoverUrl(36),
    subjects: ['Science fiction', 'Mars (Planet) -- Fiction', 'Alien invasions', 'adventure'],
    category: 'adventure',
    downloadCount: 48900,
    epubUrl: buildEpubCandidateUrls(36)[0],
  },
  {
    id: 76,
    title: 'Adventures of Huckleberry Finn',
    author: 'Mark Twain',
    coverUrl: buildCoverUrl(76),
    subjects: ['Mississippi River -- Fiction', 'Adventure stories', 'Boys -- Fiction', 'adventure'],
    category: 'adventure',
    downloadCount: 41500,
    epubUrl: buildEpubCandidateUrls(76)[0],
  },
  {
    id: 996,
    title: 'The History of Don Quixote, Vol. 1',
    author: 'Miguel de Cervantes',
    coverUrl: buildCoverUrl(996),
    subjects: ['Knights and knighthood -- Fiction', 'Spain -- Fiction', 'Adventure', 'adventure'],
    category: 'adventure',
    downloadCount: 35800,
    epubUrl: buildEpubCandidateUrls(996)[0],
  },
  {
    id: 16,
    title: 'Peter Pan',
    author: 'J. M. Barrie',
    coverUrl: buildCoverUrl(16),
    subjects: ['Neverland -- Fiction', 'Fairies -- Fiction', "Children's stories", 'adventure'],
    category: 'adventure',
    downloadCount: 31200,
    epubUrl: buildEpubCandidateUrls(16)[0],
  },
  {
    id: 219,
    title: 'Heart of Darkness',
    author: 'Joseph Conrad',
    coverUrl: buildCoverUrl(219),
    subjects: ['Congo River -- Fiction', 'Imperialism -- Fiction', 'Psychological fiction', 'adventure'],
    category: 'adventure',
    downloadCount: 30100,
    epubUrl: buildEpubCandidateUrls(219)[0],
  },

  // ================= INDONESIAN LITERATURE / KLASIK NUSANTARA =================
  {
    id: 39531,
    title: 'Letters of a Javanese Princess (Surat-Surat Kartini)',
    author: 'Raden Adjeng Kartini',
    coverUrl: buildCoverUrl(39531),
    subjects: ['Indonesia -- Social life and customs', 'Javanese Princess', 'Women -- Indonesia', 'history', 'anthropology'],
    category: 'history',
    downloadCount: 22800,
    epubUrl: buildEpubCandidateUrls(39531)[0],
    language: 'id',
  },
  {
    id: 11024,
    title: 'Max Havelaar; Or, The Coffee Auctions of the Dutch Trading Company',
    author: 'Multatuli (Eduard Douwes Dekker)',
    coverUrl: buildCoverUrl(11024),
    subjects: ['Indonesia -- History', 'Colonialism', 'Java', 'history', 'fiction'],
    category: 'history',
    downloadCount: 29500,
    epubUrl: buildEpubCandidateUrls(11024)[0],
    language: 'id',
  },
];

// Helper to filter curated classics by query and topic
function filterCuratedClassics(search: string, topic: string, language?: string): CuratedBook[] {
  let list = CURATED_CLASSICS;

  if (language && language !== 'All') {
    if (language.toLowerCase().includes('indo')) {
      const indoBooks = list.filter((b) => b.language === 'id' || b.subjects.some((s) => s.toLowerCase().includes('indonesia')));
      if (indoBooks.length > 0) list = indoBooks;
    }
  }

  if (topic) {
    const normTopic = topic.trim().toLowerCase();
    const config = CATEGORY_MAP[normTopic];
    const targetTerms = config ? config.aliases : [normTopic];

    list = list.filter((book) => {
      // Direct category match
      if (book.category && (book.category.toLowerCase() === normTopic || targetTerms.includes(book.category.toLowerCase()))) {
        return true;
      }
      // Check subjects
      if (book.subjects.some((s) => targetTerms.some((term) => s.toLowerCase().includes(term)))) {
        return true;
      }
      // Check title
      if (targetTerms.some((term) => book.title.toLowerCase().includes(term))) {
        return true;
      }
      return false;
    });
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.subjects.some((s) => s.toLowerCase().includes(q))
    );
  }

  return list;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const topic = searchParams.get('topic')?.trim() || '';
    const page = searchParams.get('page') || '1';
    const language = searchParams.get('language')?.trim() || '';

    const cacheKey = `${search}:${topic}:${page}:${language}`;
    const cached = memoryCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return Response.json(cached.data);
    }

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (topic) params.set('topic', topic);
    params.set('page', page);

    const apiUrl = `https://gutendex.com/books/?${params.toString()}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();

        interface RawAuthor {
          name: string;
          birth_year?: number;
          death_year?: number;
        }

        interface RawBook {
          id: number;
          title: string;
          authors: RawAuthor[];
          subjects: string[];
          download_count: number;
          formats: Record<string, string>;
        }

        const rawResults: RawBook[] = data.results || [];

        // If Gutendex returned results, format and return them
        if (rawResults.length > 0) {
          const books = rawResults.map((b: RawBook) => {
            const rawAuthor = b.authors?.[0]?.name || 'Unknown Author';
            const author = rawAuthor.includes(',')
              ? rawAuthor.split(',').reverse().map((s) => s.trim()).join(' ')
              : rawAuthor;

            const coverUrl = buildCoverUrl(b.id);
            const epubUrl = buildEpubCandidateUrls(
              b.id,
              b.formats['application/epub+zip'] || b.formats['application/octet-stream'] || null,
            )[0];

            return {
              id: b.id,
              title: b.title,
              author,
              coverUrl,
              subjects: (b.subjects || []).slice(0, 3),
              downloadCount: b.download_count || 0,
              epubUrl,
            };
          });

          const resultPayload = {
            count: data.count,
            next: !!data.next,
            previous: !!data.previous,
            books,
          };

          memoryCache.set(cacheKey, { timestamp: now, data: resultPayload });
          return Response.json(resultPayload);
        }
      }
    } catch (fetchErr) {
      console.warn('Gutendex fetch failed, using curated fallback:', fetchErr);
    }

    // Return cached if exists even if expired
    if (cached) {
      return Response.json(cached.data);
    }

    // High quality curated books fallback - guarantees every single category has books!
    const filtered = filterCuratedClassics(search, topic, language);

    const fallbackPayload = {
      count: filtered.length,
      next: false,
      previous: false,
      books: filtered,
    };

    // Cache fallback results
    memoryCache.set(cacheKey, { timestamp: now, data: fallbackPayload });
    return Response.json(fallbackPayload);
  } catch (error) {
    console.error('Discover API error:', error);
    const defaultBooks = CURATED_CLASSICS.slice(0, 20);
    return Response.json({
      count: defaultBooks.length,
      next: false,
      previous: false,
      books: defaultBooks,
    });
  }
}

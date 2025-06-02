import { useState, useRef, useEffect } from 'react';
import editIcon from '/logo/edit.png';
import deleteIcon from '/logo/delete.png';

type Card = {
  id: number;
  title: string;
  description: string;
  image_path: string;
  score: number;
  genres?: number[];
};

type CardGridProps = {
  cards: Card[];
  onEditClick: (card: Card) => void;
  onDelete: (id: number) => void;
};

const SORT_OPTIONS = [
  { value: 'titleAsc', label: 'Title: A → Z' },
  { value: 'titleDesc', label: 'Title: Z → A' },
  { value: 'scoreDesc', label: 'Score: High → Low' },
  { value: 'scoreAsc', label: 'Score: Low → High' },
];

function CardGrid({ cards, onEditClick, onDelete }: CardGridProps) {
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('titleAsc');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [mode, setMode] = useState<'edit' | 'delete' | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  let filteredCards = cards.filter(card =>
    card.title.toLowerCase().includes(search.toLowerCase())
  );

  switch (sortOption) {
    case 'scoreDesc':
      filteredCards.sort((a, b) => b.score - a.score);
      break;
    case 'scoreAsc':
      filteredCards.sort((a, b) => a.score - b.score);
      break;
    case 'titleAsc':
      filteredCards.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'titleDesc':
      filteredCards.sort((a, b) => b.title.localeCompare(a.title));
      break;
  }

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortOption)?.label || '';

  return (
    <main className="flex-1 ps-4.5 relative flex flex-col h-full">
      {/* Sticky Heading + Controls */}
      <div className="sticky top-0 bg-[var(--bg)] z-8">
        <h1 className="text-4xl font-semibold mb-5 ps-1">Games</h1>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4.5 ps-0.5">
          <div className="flex items-center gap-4 ps-1">
            <div className="relative inline-block w-76" ref={dropdownRef}>
              <button
                type="button"
                className="w-full ps-3 pe-2 py-2 rounded-md border-2 border-[var(--thin)] focus:outline-none focus:border-[var(--thin-brighter)] flex justify-between items-center hover:border-[var(--thin-brighter)] cursor-pointer"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
              >
                <span>{currentSortLabel}</span>
                <svg
                  className={`w-4 h-4 ml-2 duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <ul
                  role="listbox"
                  className="absolute mt-2 max-h-60 w-full overflow-auto rounded-md bg-[var(--thin)] border-2 border-[var(--thin-brighter)] large-shadow focus:outline-none"
                  tabIndex={-1}
                >
                  {SORT_OPTIONS.map(option => (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={sortOption === option.value}
                      className={`cursor-pointer select-none px-3 py-2 hover:bg-[var(--thin-brighter)] ${
                        sortOption === option.value ? 'bg-[var(--thin)] font-semibold' : ''
                      }`}
                      onClick={() => {
                        setSortOption(option.value);
                        setDropdownOpen(false);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSortOption(option.value);
                          setDropdownOpen(false);
                        }
                      }}
                      tabIndex={0}
                    >
                      {option.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <input
              type="text"
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:max-w-xs px-3 py-2 rounded-md border-2 border-[var(--thin)] focus:outline-none focus:border-[var(--thin-brighter)] hover:border-[var(--thin-brighter)] hover:placeholder-[var(--text-thin)] placeholder-[var(--thin-brighter)] focus:placeholder-[var(--text-thin)]"
            />

            <button
              onClick={() => setMode(prev => (prev === 'edit' ? null : 'edit'))}
              className={`px-3 py-2 rounded-md border-2 text-nowrap cursor-pointer
                ${mode === 'edit'
                  ? 'border-[var(--thin-brighter)] text-[var(--text-thin)] bg-[var(--thin)] hover:border-[var(--thin-brighter-brighter)] hover:text-[var(--text-thin-brighter)]'
                  : 'border-[var(--thin)] text-[var(--thin-brighter)] hover:border-[var(--thin-brighter)] hover:text-[var(--text-thin)]'
                }`}
            >
              {mode === 'edit' ? 'Edit Mode On' : 'Edit Mode Off'}
            </button>

            <button
              onClick={() => onEditClick({
                id: -1,
                title: '',
                description: '',
                image_path: '',
                score: 0,
                genres: [],
              })}
              className="px-3 py-2 rounded-md border-2 text-nowrap cursor-pointer border-[var(--thin)] text-[var(--thin-brighter)] hover:border-[var(--thin-brighter)] hover:text-[var(--text-thin)]"
            >
              + Add New Game
            </button>

            <button
              onClick={() => setMode(prev => (prev === 'delete' ? null : 'delete'))}
              className={`px-3 py-2 rounded-md border-2 text-nowrap cursor-pointer
                ${mode === 'delete'
                  ? 'border-[var(--thin-brighter)] text-[var(--text-thin)] bg-[var(--thin)] hover:border-[var(--thin-brighter-brighter)] hover:text-[var(--text-thin-brighter)]'
                  : 'border-[var(--thin)] text-[var(--thin-brighter)] hover:border-[var(--thin-brighter)] hover:text-[var(--text-thin)]'
                }`}
            >
              {mode === 'delete' ? 'Delete Mode On' : 'Delete Mode Off'}
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Card Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 p-1.5">
          {filteredCards.map(card => {
            let textColor = '';
            let bgColor = '';

            if (card.score >= 80) {
              textColor = 'text-[var(--green)]';
              bgColor = 'bg-[var(--green15)]';
            } else if (card.score >= 50) {
              textColor = 'text-yellow-700';
              bgColor = 'bg-yellow-200';
            } else {
              textColor = 'text-red-700';
              bgColor = 'bg-red-200';
            }

            return (
              <div key={card.id} className="relative card rounded-lg overflow-hidden bg-[var(--thin)] hover:scale-103 hover:bg-[#2C3142]">
                {mode === 'edit' && (
                  <button
                    onClick={() => onEditClick(card)}
                    className="absolute top-0 left-0 z-1 p-2 rounded bg-[var(--thin)] hover:bg-[var(--thin-brighter)] cursor-pointer translate-[50%]"
                    aria-label={`Edit ${card.title}`}
                  >
                    <img src={editIcon} alt="Edit" className="w-6 h-6" />
                  </button>
                )}

                {mode === 'delete' && (
                  <button
                    onClick={() => setCardToDelete(card)}
                    className="absolute top-0 left-0 z-1 p-2 rounded bg-red-600 hover:bg-red-500 cursor-pointer translate-[50%]"
                    aria-label="Delete this game"
                  >
                    <img src={deleteIcon} alt="Delete" className="w-6 h-6" />
                  </button>
                )}

                <img
                  className="w-full h-36 object-cover"
                  src={card.image_path}
                  alt={`Cover of ${card.title}`}
                  loading="lazy"
                />

                <div className="px-5 pt-4 pb-5">
                  <div className="flex w-full items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">{card.title}</h3>
                    <span className={`px-2 rounded text-sm font-medium w-fit h-fit ${textColor} ${bgColor}`}>
                      {card.score}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-thin)]">{card.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {cardToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.32)] backdrop-blur-xs z-9">
          <div className="bg-[var(--background)] px-8 py-6 rounded-lg shadow-md text-center large-shadow-darker border-2 border-[var(--thin-brighter)]">
            <p className="text-lg mb-4">
              Are you sure you want to delete <strong>{cardToDelete.title}</strong>?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  onDelete(cardToDelete.id);
                  setCardToDelete(null);
                }}
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-500 cursor-pointer"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setCardToDelete(null)}
                className="bg-[var(--thin-brighter)] px-6 py-2 rounded hover:bg-[#434B66] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default CardGrid;

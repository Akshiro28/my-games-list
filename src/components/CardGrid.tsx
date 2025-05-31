import { useState, useRef, useEffect } from 'react';

type Card = {
  id: number;
  title: string;
  description: string;
  image_path: string;
  score: number;
};

type CardGridProps = {
  cards: Card[];
};

const SORT_OPTIONS = [
  { value: 'titleAsc', label: 'Title: A → Z' },
  { value: 'titleDesc', label: 'Title: Z → A' },
  { value: 'scoreDesc', label: 'Score: High → Low' },
  { value: 'scoreAsc', label: 'Score: Low → High' },
];

function CardGrid({ cards }: CardGridProps) {
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('titleAsc');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // close dropdown if click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // filter cards by search input
  let filteredCards = cards.filter(card =>
    card.title.toLowerCase().includes(search.toLowerCase())
  );

  // sort filtered cards
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

  // get label for current sort option
  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortOption)?.label || '';

  return (
    <main className="flex-1 px-6">
      <h1 className="text-4xl font-semibold mb-5">Games</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative inline-block w-76" ref={dropdownRef}>
            <button
              type="button"
              className="w-full px-3 py-2 rounded-md border-2 border-[var(--thin)] focus:outline-none focus:border-[var(--thin-brighter)] flex justify-between items-center"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              <span>{currentSortLabel}</span>
              <svg
                className={`w-4 h-4 ml-2 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
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
                className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-md bg-[var(--thin)] border-2 border-[var(--thin-brighter)] large-shadow focus:outline-none"
                tabIndex={-1}
              >
                {SORT_OPTIONS.map(option => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={sortOption === option.value}
                    className={`cursor-pointer select-none px-4 py-2 hover:bg-[var(--thin-brighter)] ${
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

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-xs px-3 py-2 rounded-md border-2 border-[var(--thin)] focus:outline-none focus:border-[var(--thin-brighter)] placeholder-[var(--thin-brighter)] focus:placeholder-[var(--text-thin)]"
          />
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCards.map((card) => {
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
            <div key={card.id} className="bg-[var(--thin)] rounded-lg overflow-hidden card">
              <img
                src={card.image_path}
                alt={card.title}
                className="w-full h-36 object-cover"
              />

              <div className="px-5 pt-4 pb-5">
                <div className="flex w-full items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{card.title}</h3>
                  <span className={`px-2 rounded text-sm font-medium ${textColor} ${bgColor}`}>
                    {card.score}
                  </span>
                </div>

                <p className="text-sm text-[var(--text-thin)]">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default CardGrid;

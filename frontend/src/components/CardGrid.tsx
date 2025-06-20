import { useState, useRef, useEffect } from 'react';
import editIcon from '/logo/edit.png';
import deleteIcon from '/logo/delete.png';
import Card3D from './Card3D';
import { useAuth } from "../AuthContext";
import { toast } from "react-hot-toast";

export type Card = {
  _id: string;
  name: string;
  description: string;
  image: string;
  score: number;
  categories?: string[];
};

type CardGridProps = {
  cards: Card[];
  onEditClick: (card: Card) => void;
  onDelete: (_id: string) => void;
  user: any;
  readOnly?: boolean;
};

const SORT_OPTIONS = [
  { value: 'titleAsc', label: 'Title: A → Z' },
  { value: 'titleDesc', label: 'Title: Z → A' },
  { value: 'scoreDesc', label: 'Score: High → Low' },
  { value: 'scoreAsc', label: 'Score: Low → High' },
];

function CardGrid({
  cards,
  onEditClick,
  onDelete,
  user,
  readOnly = false,
}: CardGridProps) {
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('titleAsc');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const { user: authUser } = useAuth();
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  

  const [topGradientHeight, setTopGradientHeight] = useState<number>(0);
  const [bottomGradientHeight, setBottomGradientHeight] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleScroll() {
      if (!scrollContainerRef.current) return;
      const el = scrollContainerRef.current;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;

      // If content does not overflow (no scroll), hide both gradients
      if (scrollHeight <= clientHeight) {
        setTopGradientHeight(0);
        setBottomGradientHeight(0);
      } else if (scrollTop === 0) {
        setTopGradientHeight(64);
        setBottomGradientHeight(0);
      } else if (scrollTop + clientHeight >= scrollHeight - 1) {
        setTopGradientHeight(0);
        setBottomGradientHeight(64);
      } else {
        setTopGradientHeight(64);
        setBottomGradientHeight(64);
      }
    }

    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      handleScroll();
    }
    return () => {
      if (el) el.removeEventListener('scroll', handleScroll);
    };
  }, [cards]);

  const filteredCards = cards
    .filter(card =>
      (card.name ?? '').toLowerCase().includes((search ?? '').toLowerCase())
    )
    .sort((a, b) => {
      switch (sortOption) {
        case 'scoreDesc':
          return b.score - a.score;
        case 'scoreAsc':
          return a.score - b.score;
        case 'titleAsc':
          return (a.name ?? '').localeCompare(b.name ?? '');
        case 'titleDesc':
          return (b.name ?? '').localeCompare(a.name ?? '');
        default:
          return 0;
      }
    });

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortOption)?.label || '';

  return (
    <main className="flex-1 md:ps-6 relative flex flex-col h-full">
      <div className="sticky top-0 bg-[var(--bg)] z-8">
        <h1 className="text-4xl font-semibold mb-5 ps-1">Games</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6 w-full">
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start w-full">
            <div className="flex gap-2 w-full sm:w-auto sm:flex-1">
              <div className="relative w-full max-w-48 md:max-w-56 shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  className="w-full max-w-48 md:max-w-56 text-sm md:text-[16px] ps-3 pe-2 py-2 rounded-md border-2 border-[var(--thin)] focus:outline-none focus:border-[var(--thin-brighter)] flex justify-between items-center hover:border-[var(--thin-brighter)] cursor-pointer"
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
                    className="w-full max-w-48 md:max-w-56 text-sm md:text-[16px] absolute mt-2 max-h-60 overflow-auto rounded-md bg-[var(--thin)] border-2 border-[var(--thin-brighter)] large-shadow focus:outline-none"
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
                          if (scrollContainerRef.current) {
                            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSortOption(option.value);
                            setDropdownOpen(false);
                            if (scrollContainerRef.current) {
                              scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
                            }
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

              <div className="flex-grow lg:w-100 w-full text-sm md:text-[16px]">
                <input
                  type="text"
                  placeholder="Search games..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border-2 border-[var(--thin)] focus:outline-none focus:border-[var(--thin-brighter)] hover:border-[var(--thin-brighter)] hover:placeholder-[var(--text-thin)] placeholder-[var(--thin-brighter)] focus:placeholder-[var(--text-thin)] placeholder:italic"
                />
              </div>
            </div>

            {!readOnly && authUser && window.location.pathname !== '/' && (
              <div className="flex gap-2 w-full sm:w-auto sm:flex-none sm:flex-row flex-col">
                <button
                  onClick={() => {
                    onEditClick({
                      _id: '_new',
                      name: '',
                      description: '',
                      image: '',
                      score: 0,
                      categories: [],
                    });
                  }}
                  className="px-3 py-2 rounded-md border-2 text-nowrap text-sm md:text-[16px] cursor-pointer border-[var(--thin)] text-[var(--thin-brighter)] hover:border-[var(--thin-brighter)] hover:text-[var(--text-thin)]"
                >
                  + Add New Game
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef}>
        {filteredCards.length === 0 ? (
          <div className="relative flex items-center justify-center h-full w-full p-4 text-center text-[var(--thin-brighter)] rounded-md border-2 border-dashed border-[var(--thin)] italic">
            No games found.
          </div>
        ) : (
          <div key={filteredCards.map(c => c._id).join()} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 overflow-hidden">
            {filteredCards.map((card, index) => {
              let textColor = '';
              let bgColor = '';
              let borderColor = '';

              if (card.score >= 95) {
                textColor = 'text-[var(--diamond)]';
                bgColor = 'bg-[var(--diamond15)]';
                borderColor = 'border-2 border-[var(--diamond)] shadow-[0_0_16px_7px_var(--diamond15)]';
              } else if (card.score >= 80) {
                textColor = 'text-[var(--green)]';
                bgColor = 'bg-[var(--green15)]';
              } else if (card.score >= 50) {
                textColor = 'text-[var(--yellow)]';
                bgColor = 'bg-[var(--yellow15)]';
              } else {
                textColor = 'text-[var(--red)]';
                bgColor = 'bg-[var(--red15)]';
              }

              const isHovered = hoveredCardId === card._id;

              return (
                <div key={card._id ?? `card-${index}`}>
                  <Card3D>
                    <div
                      onMouseEnter={() => setHoveredCardId(card._id)}
                      onMouseLeave={() => setHoveredCardId(null)}
                      className="relative card rounded-lg overflow-hidden bg-[var(--thin)] hover:bg-[#2C3142] transition-all h-full"
                      style={{
                        animation: `fadeUp 0.8s cubic-bezier(0.18, 0.12, 0.22, 1) forwards`,
                        animationDelay: `${index * 60}ms`,
                        opacity: 0,
                        transform: 'translateY(12px)',
                      }}
                    >
                      {!readOnly && user && isHovered && window.location.pathname !== '/' && (
                        <div className="absolute top-4 left-4 flex gap-2">
                          <button
                            onClick={() => {
                              if (!authUser) {
                                toast.error("Sign in and start customizing your list!");
                                return;
                              }
                              onEditClick(card);
                            }}
                            className="p-2 rounded bg-[var(--thin)] hover:bg-[var(--thin-brighter)] cursor-pointer"
                            aria-label={`Edit ${card.name}`}
                          >
                            <img src={editIcon} alt="Edit" className="w-6 h-6" />
                          </button>
                          <button
                            onClick={() => {
                              if (!user) {
                                toast.error("Sign in and start customizing your list!");
                                return;
                              }
                              setCardToDelete(card);
                            }}
                            className="p-2 rounded bg-red-600 hover:bg-red-500 cursor-pointer"
                            aria-label="Delete this game"
                          >
                            <img src={deleteIcon} alt="Delete" className="w-6 h-6" />
                          </button>
                        </div>
                      )}
                      <img className="w-full aspect-[2/1] object-cover" src={card.image} alt={`Cover of ${card.name}`} />
                      <div className="px-5 py-4">
                        <div className="flex w-full items-center justify-between">
                          <h3 className="text-lg font-semibold pe-2">{card.name}</h3>
                          <span className={`px-2 rounded text-sm font-medium w-fit h-fit ${textColor} ${bgColor} ${borderColor}`}>
                            {card.score}
                          </span>
                        </div>
                        {card.description && (
                          <p className="text-sm text-[var(--text-thin)] mt-2">{card.description}</p>
                        )}
                      </div>
                    </div>
                  </Card3D>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {cardToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.32)] backdrop-blur-xs z-20">
          <div className="bg-[var(--background)] px-6 md:px-8 py-6 rounded-lg shadow-md text-center large-shadow-darker border-2 border-[var(--thin-brighter)] max-w-[calc(100%-32px)]">
            <p className="text-lg mb-4">
              Are you sure you want to delete "<strong>{cardToDelete.name}</strong>"?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  onDelete(cardToDelete._id);
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

      {/* Gradient overlays */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 w-full card-top-gradient transition-height duration-600 ease-in-out"
        style={{
          background: 'linear-gradient(to top, rgba(28,31,42,1), transparent)',
          height: topGradientHeight,
        }}
      />
      <div
        className={`
          pointer-events-none absolute left-0 sm:top-31 md:top-31.75 w-full card-bottom-gradient transition-height duration-600 ease-in-out
          ${!readOnly && authUser && window.location.pathname !== '/' ? 'top-43' : 'top-31'}
        `}
        style={{
          background: 'linear-gradient(to bottom, rgba(28,31,42,1), transparent)',
          height: bottomGradientHeight,
        }}
      />
    </main>
  );
}

export default CardGrid;

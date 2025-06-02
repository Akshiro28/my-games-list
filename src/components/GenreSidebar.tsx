import { useState, useRef, useEffect } from 'react';

type Genre = {
  id: number;
  name: string;
};

type GenreSidebarProps = {
  genres: Genre[];
  selectedGenre: number | null;
  setSelectedGenre: (genreId: number | null) => void;
};

function GenreSidebar({ genres, selectedGenre, setSelectedGenre }: GenreSidebarProps) {
  const [search, setSearch] = useState('');
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);
  const listRef = useRef<HTMLUListElement>(null);

  // filter genres by search input (case-insensitive)
  const filteredGenres = genres.filter(genre =>
    genre.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleScroll() {
      if (!listRef.current) return;
      const el = listRef.current;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;

      if (scrollTop === 0) {
        // at top
        setTopGradientOpacity(1);
        setBottomGradientOpacity(0);
      } else if (scrollTop + clientHeight >= scrollHeight - 1) {
        // at bottom (allowing 1px tolerance)
        setTopGradientOpacity(0);
        setBottomGradientOpacity(1);
      } else {
        // middle
        setTopGradientOpacity(1);
        setBottomGradientOpacity(1);
      }
    }

    const current = listRef.current;
    if (current) {
      current.addEventListener('scroll', handleScroll);
      // Initialize on mount
      handleScroll();
    }

    return () => {
      if (current) current.removeEventListener('scroll', handleScroll);
    };
  }, [filteredGenres]);

  return (
   <aside className="min-w-64 flex flex-col h-full relative">
      <div className="sticky top-0 bg-[var(--bg)] z-10">
        <h2 className="text-4xl font-semibold mb-5">Genres</h2>

        <input
          type="text"
          placeholder="Search genres..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 mb-6 rounded-md border-2 border-[var(--thin)] focus:outline-none focus:border-[var(--thin-brighter)] placeholder-[var(--thin-brighter)] focus:placeholder-[var(--text-thin)] hover:border-[var(--thin-brighter)] hover:placeholder-[var(--text-thin)]"
        />
      </div>

      <ul
        ref={listRef}
        className="space-y-1 overflow-y-auto flex-1 relative"
        style={{ maxHeight: 'calc(100% - 130px)' }} // adjust based on your layout
      >
        <li>
          <button
            onClick={() => setSelectedGenre(null)}
            className={`w-full text-left px-3 py-1 rounded hover:bg-[var(--thin)] cursor-pointer ${
              !selectedGenre ? 'bg-[var(--thin)]' : ''
            }`}
          >
            All
          </button>
        </li>

        {filteredGenres.map((genre) => (
          <li key={genre.id}>
            <button
              onClick={() => setSelectedGenre(genre.id)}
              className={`w-full text-left px-3 py-1 rounded hover:bg-[var(--thin)] cursor-pointer ${
                selectedGenre === genre.id ? 'bg-[var(--thin)]' : ''
              }`}
            >
              {genre.name}
            </button>
          </li>
        ))}
      </ul>

      {/* Gradients */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 w-full h-[64px] genre-top-gradient transition-opacity duration-500"
        style={{
          background: 'linear-gradient(to top, rgba(28,31,42,1), transparent)',
          opacity: topGradientOpacity,
        }}
      />

      <div
        className="pointer-events-none absolute top-[calc(5.5rem+1.5rem)] left-0 w-full h-[64px] genre-bottom-gradient transition-opacity duration-500"
        style={{
          background: 'linear-gradient(to bottom, rgba(28,31,42,1), transparent)',
          opacity: bottomGradientOpacity,
        }}
      />
    </aside>
  );
}

export default GenreSidebar;

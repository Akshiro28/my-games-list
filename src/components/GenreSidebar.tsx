import { useState } from 'react';

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

  // filter genres by search input (case-insensitive)
  const filteredGenres = genres.filter(genre =>
    genre.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
   <aside className="min-w-64 flex flex-col h-full">
      <div className="sticky top-0">
        <h2 className="text-4xl font-semibold mb-5">Genres</h2>

        <input
          type="text"
          placeholder="Search genres..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 mb-6 rounded-md border-2 border-[var(--thin)] focus:outline-none focus:border-[var(--thin-brighter)] placeholder-[var(--thin-brighter)] focus:placeholder-[var(--text-thin)] hover:border-[var(--thin-brighter)] hover:placeholder-[var(--text-thin)]"
        />
      </div>

      <ul className="space-y-1 overflow-y-auto">
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
    </aside>
  );
}

export default GenreSidebar;

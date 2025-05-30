type Genre = {
  id: number;
  name: string;
};

type GenreSidebarProps = {
  genres: Genre[];
  selectedGenre: number | null;
  setSelectedGenre: (genreId: number | null) => void;
};


function GenreSidebar({
  genres,
  selectedGenre,
  setSelectedGenre,
}: GenreSidebarProps) {
  return (
    <aside className="w-64 bg-gray-100 border-r p-4">
      <h2 className="text-xl font-semibold mb-4">Genres</h2>
      <ul className="space-y-2">
        <li>
          <button
            onClick={() => setSelectedGenre(null)}
            className={`w-full text-left px-2 py-1 rounded hover:bg-gray-200 ${
              !selectedGenre ? 'bg-gray-300' : ''
            }`}
          >
            All
          </button>
        </li>
        {genres.map((genre) => (
          <li key={genre.id}>
            <button
              onClick={() => setSelectedGenre(genre.id)}
              className={`w-full text-left px-2 py-1 rounded hover:bg-gray-200 ${
                selectedGenre === genre.id ? 'bg-gray-300' : ''
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

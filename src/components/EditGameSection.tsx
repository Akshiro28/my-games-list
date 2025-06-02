import { useState, useEffect } from 'react';

type Card = {
  id: number;
  title: string;
  description: string;
  image_path: string;
  score: number;
  genres?: number[]; // expected to be array of genre IDs
};

type Genre = {
  id: number;
  name: string;
};

type EditGameSectionProps = {
  card: Card | null;
  onClose: () => void;
  onSave: (updatedCard: Card) => void;
  isNew?: boolean;
};

function EditGameSection({ card, onClose, onSave, isNew }: EditGameSectionProps) {
  const [formData, setFormData] = useState<Card | null>(null);
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);

  useEffect(() => {
    async function fetchGenres() {
      try {
        const res = await fetch('http://localhost:5000/api/genres');
        const data = await res.json();
        setAvailableGenres(data);
      } catch (err) {
        console.error('Failed to fetch genres', err);
      }
    }

    fetchGenres();
  }, []);

  useEffect(() => {
    if (card) {
      setFormData({
        id: card.id,
        title: card.title || '',
        description: card.description || '',
        image_path: card.image_path || '',
        score: card.score || 0,
        genres: card.genres || [], // ensure genres exists
      });
      setSelectedGenres(card.genres || []);
    } else if (isNew) {
      // Reset form when adding a new game
      setFormData({
        id: -1,
        title: '',
        description: '',
        image_path: '',
        score: 0,
        genres: [],
      });
      setSelectedGenres([]);
    }
  }, [card, isNew]);

  if (!card || !formData) return null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev =>
      prev ? { ...prev, [name]: name === 'score' ? Number(value) : value } : null
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData) return;

    try {
      const isNew = formData.id === -1;

      const response = await fetch(`http://localhost:5000/api/cards${isNew ? '' : '/' + formData.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          image_path: formData.image_path,
          score: formData.score,
          genres: selectedGenres,
        }),
      });

      if (!response.ok) throw new Error(`${isNew ? 'Creating' : 'Updating'} game failed`);

      const updatedCard = await response.json();
      onSave(updatedCard); // will also close the form
    } catch (err) {
      console.error('Error saving card:', err);
    }
  }

  return (
    <section
      className="h-full overflow-auto pt-5 pe-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="edit-game-title"
    >
      <button
        onClick={onClose}
        className="mb-6 bg-[var(--thin)] py-2 px-4 rounded-md cursor-pointer hover:bg-[var(--thin-brighter)] transition-colors"
        aria-label="Go back to games list"
      >
        &larr; Cancel
      </button>

      <h2 id="edit-game-title" className="text-3xl font-semibold mb-6">
        {isNew ? 'Add New Game' : 'Edit Game'}
      </h2>

      <form onSubmit={handleSubmit} className="w-200 max-w-full flex flex-col gap-6">
        <label>
          Title
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full border-2 border-gray-300 rounded p-2 mt-1"
          />
        </label>

        <label>
          Description
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            required
            className="w-full border-2 border-gray-300 rounded p-2 mt-1"
          />
        </label>

        <label>
          Image URL
          <input
            type="text"
            name="image_path"
            value={formData.image_path}
            onChange={handleChange}
            required
            className="w-full border-2 border-gray-300 rounded p-2 mt-1"
          />
        </label>

        <label>
          Score
          <input
            type="number"
            name="score"
            value={formData.score}
            min={0}
            max={100}
            onChange={handleChange}
            required
            className="w-full border-2 border-gray-300 rounded p-2 mt-1"
          />
        </label>

        <div>
          <div className="mb-1 font-semibold">
            Genres (multiple select)
          </div>
          
          <div className="flex flex-wrap gap-2">
            {availableGenres.map((genre) => {
              const isSelected = selectedGenres.includes(genre.id);
              return (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      // Remove genre from selected
                      setSelectedGenres(selectedGenres.filter((id) => id !== genre.id));
                    } else {
                      // Add genre to selected
                      setSelectedGenres([...selectedGenres, genre.id]);
                    }
                  }}
                  className={`cursor-pointer rounded-md py-2 px-4 transition-colors
                    ${isSelected ? 'bg-[var(--thin-brighter-brighter)] hover:bg-[var(--thin-brighter-brighter-brighter)]' : 'bg-[var(--thin)] hover:bg-[var(--thin-brighter)]'}`}
                  aria-pressed={isSelected}
                >
                  {genre.name}
                </button>
              );
            })}
          </div>
        </div>


        <button
          type="submit"
          className="bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 cursor-pointer"
        >
          Save Changes
        </button>
      </form>
    </section>
  );
}

export default EditGameSection;

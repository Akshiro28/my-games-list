import { useState, useEffect } from 'react';

type Card = {
  _id?: string;  // MongoDB _id is a string and optional for new cards
  name: string;
  description: string;
  image_path: string;
  score: number;
  genres?: string[]; // array of genre _id strings
};

type Genre = {
  _id: string;
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
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

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
        _id: card._id,
        name: card.name || '',
        description: card.description || '',
        image_path: card.image_path || '',
        score: card.score || 0,
        genres: card.genres || [],
      });
      setSelectedGenres(card.genres || []);
    } else if (isNew) {
      // Reset form for new game
      setFormData({
        name: '',
        description: '',
        image_path: '',
        score: 0,
        genres: [],
      });
      setSelectedGenres([]);
    } else {
      setFormData(null); // no card and not new -> no form
    }
  }, [card, isNew]);

  if (!formData) return null; // show form only if formData ready

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
      const isCreating = isNew || formData._id === undefined;

      const response = await fetch(`http://localhost:5000/api/cards${isCreating ? '' : '/' + formData._id}`, {
        method: isCreating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          image: formData.image_path,
          score: formData.score,
          genres: selectedGenres,
        }),
      });

      if (!response.ok) throw new Error(`${isCreating ? 'Creating' : 'Updating'} game failed`);

      const updatedCard = await response.json();
      onSave(updatedCard);
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
            value={formData.name}
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
          <div className="mb-1 font-semibold">Genres (multiple select)</div>

          <div className="flex flex-wrap gap-2">
            {availableGenres.map((genre) => {
              const isSelected = selectedGenres.includes(genre._id);
              return (
                <button
                  key={genre._id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedGenres(selectedGenres.filter((id) => id !== genre._id));
                    } else {
                      setSelectedGenres([...selectedGenres, genre._id]);
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

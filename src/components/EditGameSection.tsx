import { useState, useEffect } from 'react';

type Card = {
  id: number;
  title: string;
  description: string;
  image_path: string;
  score: number;
  genres?: number[];
};

type Genre = {
  id: number;
  name: string;
};

type EditGameSectionProps = {
  card: Card | null;
  onClose: () => void;
  onSave: (updatedCard: Card) => void;
};

function EditGameSection({ card, onClose, onSave }: EditGameSectionProps) {
  const [formData, setFormData] = useState<Card | null>(null);
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);

  useEffect(() => {
    if (card) {
      setFormData(card);
      setSelectedGenres(card.genres || []);
    }
  }, [card]);

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

  if (!card || !formData) return null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: name === 'score' ? Number(value) : value } : null);
  }

  function handleGenreChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = Array.from(e.target.selectedOptions, option => Number(option.value));
    setSelectedGenres(selected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData) return;

    try {
      const res = await fetch(`http://localhost:5000/api/cards/${formData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          image_path: formData.image_path,
          score: formData.score,
          genres: selectedGenres,
        }),
      });

      if (!res.ok) throw new Error('Failed to update game');

      // Backend sends just message? Let's assume it returns updated card.
      // If backend doesn't return updated card, you may want to fetch it again or merge manually.

      // For now, assume updatedCard is formData + genres:
      const updatedCard = { ...formData, genres: selectedGenres };

      onSave(updatedCard);
    } catch (err) {
      console.error('Error updating card:', err);
    }
  }

  return (
    <section
      className="h-full overflow-auto p-8"
      aria-modal="true"
      role="dialog"
      aria-labelledby="edit-game-title"
    >
      <button
        onClick={onClose}
        className="mb-6 text-blue-600 hover:underline"
        aria-label="Go back to games list"
      >
        &larr; Back
      </button>

      <h2 id="edit-game-title" className="text-3xl font-semibold mb-6">Edit Game</h2>

      <form onSubmit={handleSubmit} className="max-w-lg flex flex-col gap-6">
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

        <label>
          Genres (hold Ctrl/Cmd to select multiple)
          <select
            multiple
            value={selectedGenres.map(String)} // convert to string for controlled select
            onChange={handleGenreChange}
            className="w-full border-2 border-gray-300 rounded p-2 mt-1"
          >
            {availableGenres.map(genre => (
              <option key={genre.id} value={String(genre.id)}>
                {genre.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Save Changes
        </button>
      </form>
    </section>
  );
}

export default EditGameSection;

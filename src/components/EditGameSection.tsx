import { useState, useEffect, useRef } from 'react';

type Card = {
  _id?: string;
  name: string;
  description: string;
  image: string;
  score: number;
  genres?: string[];
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

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
        image: card.image || '',
        score: card.score || 0,
        genres: card.genres || [],
      });
      setSelectedGenres(card.genres || []);
      setImagePreview(card.image || '');
      setSelectedFile(null);
    } else if (isNew) {
      setFormData({
        name: '',
        description: '',
        image: '',
        score: 0,
        genres: [],
      });
      setSelectedGenres([]);
      setImagePreview('');
      setSelectedFile(null);
    } else {
      setFormData(null);
    }
  }, [card, isNew]);

  if (!formData) return null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev =>
      prev ? { ...prev, [name]: name === 'score' ? Number(value) : value } : null
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  function handleClickDropzone() {
    inputRef.current?.click();
  }

  async function uploadImageToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'unsigned_preset'); // replace with your preset

    const res = await fetch('https://api.cloudinary.com/v1_1/dthzdr1wz/image/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error('Image upload failed');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData) return;

    try {
      let imageUrl = formData.image;

      if (selectedFile) {
        imageUrl = await uploadImageToCloudinary(selectedFile);
      }

      const isCreating = isNew || formData._id === undefined;

      const response = await fetch(`http://localhost:5000/api/cards${isCreating ? '' : '/' + formData._id}`, {
        method: isCreating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          image: imageUrl,
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
    <section className="h-full overflow-auto pt-5 pe-4" aria-modal="true" role="dialog" aria-labelledby="edit-game-title">
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
            name="name"
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

        {/* ✅ MOVED input outside */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }} // ✅ hidden properly
        />

        {/* ✅ Dropzone only wraps preview/label now */}
        <label>
          Upload Image
          <div
            onClick={handleClickDropzone}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            tabIndex={0}
            role="button"
            aria-label="Upload image by clicking or dragging and dropping"
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleClickDropzone();
                e.preventDefault();
              }
            }}
            className={`mt-1 w-full border-2 rounded p-6 text-center cursor-pointer select-none
              ${dragOver ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white'}
            `}
            style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Selected preview"
                className="max-h-48 max-w-full object-contain rounded"
              />
            ) : (
              <p className="text-gray-500">Click or drag & drop an image here</p>
            )}
          </div>
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
                    ${
                      isSelected
                        ? 'bg-[var(--thin-brighter-brighter)] hover:bg-[var(--thin-brighter-brighter-brighter)]'
                        : 'bg-[var(--thin)] hover:bg-[var(--thin-brighter)]'
                    }`}
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

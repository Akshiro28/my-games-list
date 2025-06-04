import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

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

  const MAX_FILE_SIZE = 200 * 1024; // 200KB

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

    if (name === 'score') {
      setFormData(prev =>
        prev ? { ...prev, score: value === '' ? 0 : Number(value) } : null
      );
    } else if (name === 'description') {
      if (value.length > 100) {
        toast.error("Description cannot exceed 100 characters.");
        return;
      }
      setFormData(prev => prev ? { ...prev, description: value } : null);
    } else if (name === 'name') {
      if (value.length > 100) {
        toast.error("Title cannot exceed 100 characters.");
        return;
      }
      setFormData(prev => prev ? { ...prev, name: value } : null);
    } else {
      setFormData(prev => prev ? { ...prev, [name]: value } : null);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Image size must be 200KB or less.");
        return;
      }
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
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Image size must be 200KB or less.");
        return;
      }
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

    // Manual validation with toast notifications
    if (!formData.name.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Description cannot be empty');
      return;
    }
    if (formData.score < 1 || formData.score > 100) {
      toast.error('Score must be between 1 and 100');
      return;
    }
    if (!formData.image && !selectedFile) {
      toast.error('Please upload an image');
      return;
    }

    try {
      let imageUrl = formData.image;

      if (selectedFile) {
        imageUrl = await uploadImageToCloudinary(selectedFile);
      }

      const isCreating = isNew || formData._id === undefined;

      const safeScore = typeof formData.score === 'number' && !isNaN(formData.score) ? formData.score : 0;

      const response = await fetch(`http://localhost:5000/api/cards${isCreating ? '' : '/' + formData._id}`, {
        method: isCreating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          image: imageUrl,
          score: safeScore,
          genres: selectedGenres,
        }),
      });

      if (!response.ok) throw new Error(`${isCreating ? 'Creating' : 'Updating'} game failed`);

      const updatedCard = await response.json();
      onSave(updatedCard);
    } catch (err) {
      console.error('Error saving card:', err);
      toast.error('Failed to save the game. Please try again.');
    }
  }

  return (
    <section className="h-full overflow-auto pt-5 pe-4" aria-modal="true" role="dialog" aria-labelledby="edit-game-title">
      <button
        onClick={onClose}
        className="mb-6 bg-[var(--thin)] py-2 px-4 rounded-md cursor-pointer hover:bg-[var(--thin-brighter)]"
        aria-label="Go back to games list"
      >
        &larr; Cancel
      </button>

      <h2 id="edit-game-title" className="text-3xl font-semibold mb-6">
        {isNew ? 'Add New Game' : 'Edit Game'}
      </h2>

      <form onSubmit={handleSubmit} className="w-200 max-w-full flex flex-col gap-6">
        <label className="block">
          <span className="mb-2 block">Title (100 characters max)</span>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter game title"
            className="w-full border-2 border-[var(--thin)] rounded-md py-2 px-3 focus:outline-none hover:border-[var(--thin-brighter)] focus:border-[var(--thin-brighter)] hover:placeholder-[var(--text-thin)] placeholder-[var(--thin-brighter)] focus:placeholder-[var(--text-thin)]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block">Description (100 characters max)</span>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Enter game description"
            className="w-full border-2 border-[var(--thin)] rounded-md py-2 px-3 focus:outline-none hover:border-[var(--thin-brighter)] focus:border-[var(--thin-brighter)] hover:placeholder-[var(--text-thin)] placeholder-[var(--thin-brighter)] focus:placeholder-[var(--text-thin)]"
          />
        </label>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <label className="block">
          <span className="mb-2 block">Upload Image (200 KB max)</span>
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
            className={`group w-full border-2 border-dashed border-[var(--thin)] rounded-md p-4 text-center cursor-pointer select-none hover:border-[var(--thin-brighter)]
              ${dragOver ? 'border-[var(--thin-brighter-brighter)] bg-[var(--thin)]' : 'border-[var(--thin)]'}
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
              <p className="text-[var(--thin-brighter)] group-hover:text-[var(--thin-brighter-brighter)]">
                Click or drag & drop an image here
              </p>
            )}
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block">Score (1-100)</span>
          <input
            type="number"
            name="score"
            value={formData.score}
            min={0}
            max={100}
            onChange={handleChange}
            className="w-full border-2 border-[var(--thin)] rounded-md py-2 px-3 focus:outline-none hover:border-[var(--thin-brighter)] focus:border-[var(--thin-brighter)]"
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
                  className={`cursor-pointer rounded-md py-2 px-4
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
          className="bg-[var(--thin)] hover:bg-[var(--thin-brighter)] text-white py-2 rounded-md cursor-pointer"
        >
          {isNew ? 'Add Game' : 'Save Changes'}
        </button>
      </form>
    </section>
  );
}

export default EditGameSection;

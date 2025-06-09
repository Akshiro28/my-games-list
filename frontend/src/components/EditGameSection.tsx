import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import React from 'react';
import { getAuth } from "firebase/auth";

type Card = {
  _id?: string;
  name: string;
  description: string;
  image: string;
  cloudinaryPublicId?: string;
  score: number;
  categories?: string[];
};

type Category = {
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
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const [formData, setFormData] = useState<Card | null>(null);
  const [availableCategories, setAvailableCategories] = React.useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  useEffect(() => {
    async function fetchCategories() {
      try {
        const user = getAuth().currentUser;
        if (!user) {
          console.warn('User not logged in');
          return;
        }

        const token = await user.getIdToken();

        const res = await fetch(`${baseUrl}/api/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch categories (${res.status})`);
        }

        const data = await res.json();
        setAvailableCategories(data);
      } catch (err) {
        console.error('Failed to fetch categories', err);
        toast.error("Could not load categories");
      }
    }
    fetchCategories();
  }, [baseUrl]);

  useEffect(() => {
    if (card) {
      setFormData({
        _id: card._id,
        name: card.name || '',
        description: card.description || '',
        image: card.image || '',
        cloudinaryPublicId: card.cloudinaryPublicId,
        score: card.score || 0,
        categories: card.categories || [],
      });
      setSelectedCategories(card.categories || []);
      setImagePreview(card.image || '');
      setSelectedFile(null);
    } else if (isNew) {
      setFormData({
        name: '',
        description: '',
        image: '',
        cloudinaryPublicId: undefined,
        score: 0,
        categories: [],
      });
      setSelectedCategories([]);
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
      let numericValue = value === '' ? 0 : Number(value);

      if (numericValue > 100) {
        numericValue = 100;
        toast.error('Score cannot exceed 100');
      } else if (numericValue < 0) {
        numericValue = 0;
        toast.error('Score cannot be below 0');
      }

      setFormData(prev =>
        prev ? { ...prev, score: numericValue } : null
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > MAX_FILE_SIZE) {
        toast.error("Image size must be 10MB or less.");
        return;
      }

      try {
        const resizedBlob = await resizeImageIfNeeded(file);
        const previewUrl = URL.createObjectURL(resizedBlob);
        setImagePreview(previewUrl);

        // Convert resized Blob back to File so Cloudinary gets a proper filename
        const resizedFile = new File([resizedBlob], file.name, { type: file.type });
        setSelectedFile(resizedFile);
      } catch (err) {
        console.error("Image resizing failed", err);
        toast.error("Failed to resize image");
      }
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

  const MAX_DIMENSION = 960;

  function resizeImageIfNeeded(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        let { width, height } = img;

        if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
          // No resize needed
          URL.revokeObjectURL(url);
          return resolve(file);
        }

        const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        const newWidth = Math.round(width * scale);
        const newHeight = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas 2D context not supported'));

        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Image resizing failed'));
        }, file.type || 'image/jpeg');
        URL.revokeObjectURL(url);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image loading failed'));
      };

      img.src = url;
    });
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    try {
      const processedBlob = await resizeImageIfNeeded(file);
      
      // Preview
      const previewUrl = URL.createObjectURL(processedBlob);
      setImagePreview(previewUrl); // Optional preview state

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', processedBlob);
      formData.append('upload_preset', 'unsigned_preset');

      const res = await fetch('https://api.cloudinary.com/v1_1/dthzdr1wz/image/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.secure_url && data.public_id) {
        setFormData(prev =>
          prev ? { ...prev, image: data.secure_url, cloudinaryPublicId: data.public_id } : null
        );
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Image upload failed');
    }
  };

  function handleClickDropzone() {
    inputRef.current?.click();
  }

  // Upload image and return object with url and public_id
  async function uploadImageToCloudinary(file: File): Promise<{ url: string, publicId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'unsigned_preset');

    const res = await fetch('https://api.cloudinary.com/v1_1/dthzdr1wz/image/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (data.secure_url && data.public_id) {
      return { url: data.secure_url, publicId: data.public_id };
    } else {
      throw new Error('Image upload failed');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData || loading) return;

    if (!formData.name.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    if (formData.score < 1 || formData.score > 100) {
      toast.error('Score must be between 1 and 100');
      return;
    }
    if (!formData.image && !selectedFile) {
      toast.error('Image cannot be empty');
      return;
    }

    let toastId: string | undefined;

    try {
      setLoading(true);
      toastId = toast.loading('Saving game...');

      let imageUrl = formData.image;
      let cloudinaryPublicId = formData.cloudinaryPublicId;

      const isCreating = isNew || formData._id === undefined;
      const safeScore = typeof formData.score === 'number' && !isNaN(formData.score) ? formData.score : 0;

      // NEW: If replacing image on an existing card, delete old image from Cloudinary
      if (!isCreating && selectedFile && cloudinaryPublicId) {
        try {
          const user = getAuth().currentUser;
          if (!user) throw new Error("User not logged in");
          const token = await user.getIdToken();

          await fetch(`${baseUrl}/api/images/delete`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,  // <<< important
            },
            body: JSON.stringify({ publicId: cloudinaryPublicId }),
          });
        } catch (err) {
          console.error('Failed to delete old image from Cloudinary:', err);
          // We can still proceed, but notify user optionally
        }
      }

      // Upload new image if there's a selected file
      if (selectedFile) {
        const uploadResult = await uploadImageToCloudinary(selectedFile);
        imageUrl = uploadResult.url;
        cloudinaryPublicId = uploadResult.publicId;
      }

      const user = getAuth().currentUser;
      if (!user) throw new Error("User not logged in");
      const token = await user.getIdToken();

      const response = await fetch(`${baseUrl}/api/cards${isCreating ? '' : '/' + formData._id}`, {
        method: isCreating ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          image: imageUrl,
          cloudinaryPublicId: cloudinaryPublicId,
          score: safeScore,
          categories: selectedCategories,
        }),
      });

      if (!response.ok) throw new Error(`${isCreating ? 'Creating' : 'Updating'} game failed`);

      const updatedCard = await response.json();
      onSave(updatedCard);

      toast.success(isNew ? 'Game saved successfully!' : 'Changes saved', { id: toastId });
    } catch (err) {
      console.error('Error saving card:', err);
      toast.error('Failed to save the game. Please try again.', { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full container mx-auto h-full overflow-auto pt-5" aria-modal="true" role="dialog" aria-labelledby="edit-game-title">
      <div className="mx-auto w-fit">
        <button
          onClick={onClose}
          className="mb-6 bg-[var(--thin)] py-2 px-4 rounded-md cursor-pointer hover:bg-[var(--thin-brighter)]"
          aria-label="Go back to games list"
        >
          &larr; Go back
        </button>

        <h2 id="edit-game-title" className="text-3xl font-semibold mb-6">
          {isNew ? 'Add New Game' : 'Edit Game'}
        </h2>

        <form onSubmit={handleSubmit} className="w-160 max-w-full flex flex-col gap-6">
          <div className="block">
            <span className="mb-2 block">Title <span className="text-[var(--thin-brighter-brighter)]">(100 characters max)</span></span>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter game title..."
              className="w-full border-2 border-[var(--thin)] rounded-md py-2 px-3 focus:outline-none hover:border-[var(--thin-brighter)] focus:border-[var(--thin-brighter)] hover:placeholder-[var(--text-thin)] placeholder-[var(--thin-brighter)] focus:placeholder-[var(--text-thin)] placeholder:italic"
            />
          </div>

          <div className="block">
            <span className="mb-2 block">(Optional) Description <span className="text-[var(--thin-brighter-brighter)]">(100 characters max)</span></span>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Enter game description..."
              className="w-full border-2 border-[var(--thin)] rounded-md py-2 px-3 focus:outline-none hover:border-[var(--thin-brighter)] focus:border-[var(--thin-brighter)] hover:placeholder-[var(--text-thin)] placeholder-[var(--thin-brighter)] focus:placeholder-[var(--text-thin)] placeholder:italic"
            />
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <div className="block">
            <span className="mb-2 block">Upload Image <span className="text-[var(--thin-brighter-brighter)]">(10MB max)</span></span>
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
                <p className="text-[var(--thin-brighter)] group-hover:text-[var(--text-thin)] italic">
                  Click or drag & drop an image here
                </p>
              )}
            </div>
          </div>

          <div className="block">
            <span className="mb-2 block">Score <span className="text-[var(--thin-brighter-brighter)]">(1-100)</span></span>
            <input
              type="number"
              name="score"
              value={formData.score}
              onChange={handleChange} // no inline validation here
              min={0}
              max={100}
              className="w-full border-2 border-[var(--thin)] rounded-md py-2 px-3 focus:outline-none hover:border-[var(--thin-brighter)] focus:border-[var(--thin-brighter)]"
            />
          </div>

          <fieldset>
            <legend className="mb-2 block">(Optional) Categories <span className="text-[var(--thin-brighter-brighter)]">(multiple select)</span></legend>

            {!Array.isArray(availableCategories) || availableCategories.length === 0 ? (
              <p className="italic text-[var(--thin-brighter)]">
                No categories yet. Add one to begin categorizing your games.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => {
                  const isSelected = selectedCategories.includes(category._id);
                  return (
                    <button
                      key={category._id}
                      type="button"
                      onClick={() => {
                        setSelectedCategories((prevSelected) =>
                          isSelected
                            ? prevSelected.filter((id) => id !== category._id)
                            : [...prevSelected, category._id]
                        );
                      }}
                      className={`cursor-pointer rounded-md py-2 px-4 flex-shrink-0 flex-grow-0 ${
                        isSelected
                          ? 'bg-[var(--thin-brighter-brighter)] hover:bg-[var(--thin-brighter-brighter-brighter)]'
                          : 'bg-[var(--thin)] hover:bg-[var(--thin-brighter)]'
                      }`}
                      aria-pressed={isSelected}
                      aria-label={`${category.name} category ${isSelected ? 'selected' : 'not selected'}`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>

          <button
            type="submit"
            disabled={loading}
            className={`bg-blue-600 py-3 rounded-md text-white font-semibold cursor-pointer
              hover:bg-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {loading ? (isNew ? 'Adding...' : 'Saving...') : (isNew ? 'Add game' : 'Save changes')}
          </button>
        </form>
      </div>
    </section>
  );
}

export default EditGameSection;

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import React from 'react';
import { getAuth } from "firebase/auth";
import { useDebounce } from "../hooks/useDebounce";

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

type GameSuggestion = {
  title: string;
  image: string;
};


function EditGameSection({ card, onClose, onSave, isNew }: EditGameSectionProps) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const [formData, setFormData] = useState<Card | null>(null);
  const [availableCategories, setAvailableCategories] = React.useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const debouncedTitleInput = useDebounce(titleInput, 200);
  const [titleSuggestions, setTitleSuggestions] = useState<GameSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [defaultImageUrl, setDefaultImageUrl] = useState<string | null>(null);
  const [originalCloudinaryPublicId, setOriginalCloudinaryPublicId] = useState<string | undefined>();
  const [isUsingDefaultImage, setIsUsingDefaultImage] = React.useState(true);

  const dragCounter = useRef(0);

  useEffect(() => {
    const query = debouncedTitleInput.trim();
    if (query.length === 0) {
      setTitleSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        setIsLoadingSuggestions(true);
        const res = await fetch(`${baseUrl}/api/suggestions?query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error(`Suggestions fetch failed with status ${res.status}`);
        const data: GameSuggestion[] = await res.json();
        setTitleSuggestions(data);
      } catch (err) {
        console.error("Failed to fetch title suggestions", err);
        setTitleSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [debouncedTitleInput]);

  useEffect(() => {
    if ((titleSuggestions.length > 0 || isLoadingSuggestions) && isInputFocused) {
      setShowSuggestions(true);
    }
  }, [titleSuggestions, isInputFocused, isLoadingSuggestions]);

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

  useEffect(() => {
    if (formData?.cloudinaryPublicId) {
      setOriginalCloudinaryPublicId(formData.cloudinaryPublicId);
    }
  }, [formData]);

  useEffect(() => {
    if (isUsingDefaultImage && debouncedTitleInput.trim().length > 0) {
      fetchDefaultImageForTitle(debouncedTitleInput.trim());
    }
  }, [debouncedTitleInput, isUsingDefaultImage]);

  if (!formData) return null;

  async function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
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

      // Don't delete Cloudinary image yet — just reset the preview and image fields
      setFormData(prev => prev ? {
        ...prev,
        name: value,
        image: "",
        cloudinaryPublicId: "",
      } : null);

      setTitleInput(value);
      setIsUsingDefaultImage(true);
      setImagePreview(null);
      setSelectedFile(null);
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
        setIsUsingDefaultImage(false);

        // Convert resized Blob back to File so Cloudinary gets a proper filename
        const resizedFile = new File([resizedBlob], file.name, { type: file.type });
        setSelectedFile(resizedFile);
      } catch (err) {
        console.error("Image resizing failed", err);
        toast.error("Failed to resize image");
      }
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current += 1;
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setDragOver(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault(); // Required to allow drop
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
    dragCounter.current = 0;
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    try {
      const processedBlob = await resizeImageIfNeeded(file);

      const previewUrl = URL.createObjectURL(processedBlob);
      setImagePreview(previewUrl); // ✅ shows preview

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

  const handleClickDropzone = () => {
    inputRef.current?.click();
  };

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

    let toastId: string | undefined;

    try {
      setLoading(true);
      toastId = toast.loading('Saving game...');

      const isCreating = isNew || formData._id === undefined;
      const safeScore =
        typeof formData.score === 'number' && !isNaN(formData.score)
          ? formData.score
          : 0;

      const user = getAuth().currentUser;
      if (!user) {
        toast.error('User not logged in', { id: toastId });
        return;
      }

      const token = await user.getIdToken();
      let imageUrl = formData.image;
      let cloudinaryPublicId = formData.cloudinaryPublicId;

      // STEP 1: Send initial request without uploading new image yet
      const response = await fetch(
        `${baseUrl}/api/cards${isCreating ? '' : '/' + formData._id}`,
        {
          method: isCreating ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            image: imageUrl,
            cloudinaryPublicId: cloudinaryPublicId,
            score: safeScore,
            categories: selectedCategories,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result?.message?.includes('already exists')) {
          toast.error('A game with that title already exists', { id: toastId });
        } else {
          toast.error(result?.message || 'Failed to save the game', { id: toastId });
        }
        return;
      }

      // STEP 2: If user selected a new file, upload it now and update the card
      if (selectedFile) {
        // Delete old image if editing and old publicId exists
        if (!isCreating && originalCloudinaryPublicId) {
          try {
            await fetch(`${baseUrl}/api/images/delete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ publicId: originalCloudinaryPublicId }),
            });
          } catch {
            // Suppress cloudinary deletion error
          }
        }

        const uploadResult = await uploadImageToCloudinary(selectedFile);
        imageUrl = uploadResult.url;
        cloudinaryPublicId = uploadResult.publicId;

        // PATCH the game with the uploaded image
        const updateImageRes = await fetch(`${baseUrl}/api/cards/${result._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            image: imageUrl,
            cloudinaryPublicId: cloudinaryPublicId,
          }),
        });

        if (!updateImageRes.ok) {
          toast.error('Image uploaded but failed to attach to game', { id: toastId });
          return;
        }
      }

      // STEP 3: Success
      onSave({ ...result, image: imageUrl, cloudinaryPublicId });
      setOriginalCloudinaryPublicId(cloudinaryPublicId);

      toast.success(isNew ? 'Game saved successfully!' : 'Changes saved', {
        id: toastId,
      });
    } catch {
      toast.error('Failed to save the game. Please try again.', { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  const fetchDefaultImageForTitle = async (title: string) => {
    if (!title) return;

    try {
      const res = await fetch(`/api/suggestions?query=${encodeURIComponent(title)}`);

      const contentType = res.headers.get("Content-Type") || "";
      const text = await res.text();

      if (!res.ok || !contentType.toLowerCase().includes("application/json")) {
        return;
      }

      const data = JSON.parse(text);
      const imageUrl = data[0]?.image?.trim();

      if (imageUrl) {
        setDefaultImageUrl(imageUrl);

        // Only update formData.image and imagePreview if currently using default image
        // so that if user uploaded a custom image, it stays until title changes again.
        if (isUsingDefaultImage) {
          setFormData((prev) =>
            prev
              ? {
                  ...prev,
                  image: imageUrl,
                  cloudinaryPublicId: undefined,
                }
              : null
          );
          setImagePreview(imageUrl);
        }
      } else {
        setDefaultImageUrl(null);
      }
    } catch (err) {
      console.error("Failed to fetch RAWG image", err);
    }
  };

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

        <form onSubmit={handleSubmit} className="max-w-160 w-full flex flex-col gap-6">
          {/* Title Input */}
          <div className="block relative">
            <span className="mb-2 block">
              Title <span className="text-[var(--thin-brighter-brighter)]">(100 characters max)</span>
            </span>
            <input
              type="text"
              name="name"
              autoComplete="off"
              value={formData?.name || ""}
              ref={inputRef}
              onChange={handleChange}
              onFocus={() => {
                setIsInputFocused(true);
                if (titleSuggestions.length > 0 || isLoadingSuggestions) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => {
                setIsInputFocused(false);
                setTimeout(() => setShowSuggestions(false), 150);

                if (formData?.name?.trim()) {
                  const match = titleSuggestions.find(
                    (s) => s.title.toLowerCase() === formData.name.trim().toLowerCase()
                  );

                  if (match?.image) {
                    setFormData((prev) =>
                      prev ? { ...prev, image: match.image, cloudinaryPublicId: undefined } : null
                    );
                    setDefaultImageUrl(match.image);
                  } else {
                    fetchDefaultImageForTitle(formData.name.trim());
                  }
                }
              }}
              placeholder="Enter game title..."
              className="w-full border-2 border-[var(--thin)] rounded-md py-2 px-3 focus:outline-none hover:border-[var(--thin-brighter)] focus:border-[var(--thin-brighter)] hover:placeholder-[var(--text-thin)] placeholder-[var(--thin-brighter)] focus:placeholder-[var(--text-thin)] placeholder:italic"
            />

            {showSuggestions && (isLoadingSuggestions || titleSuggestions.length > 0) && (
              <ul className="absolute top-full left-0 right-0 border-2 border-[var(--thin-brighter)] bg-[var(--thin)] mt-2 z-10 rounded-md max-h-40 overflow-y-auto">
                {isLoadingSuggestions ? (
                  <li className="px-3 py-2 italic text-[var(--text-thin-brighter)]">
                    Loading suggestions...
                  </li>
                ) : (
                  titleSuggestions.map((suggestion, idx) => (
                    <li
                      key={idx}
                      onMouseDown={() => {
                        setFormData((prev) =>
                          prev
                            ? {
                                ...prev,
                                name: suggestion.title,
                                image: suggestion.image,
                                cloudinaryPublicId: undefined,
                              }
                            : null
                        );
                        setTitleInput(suggestion.title);
                        setTitleSuggestions([]);
                        setShowSuggestions(false);
                        setDefaultImageUrl(suggestion.image);
                      }}
                      className="px-3 py-2 hover:bg-[var(--thin-brighter)] cursor-pointer"
                    >
                      {suggestion.title}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {/* Description */}
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

          {/* Hidden File Input */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* Cover Image Section */}
          <div className="block">
            <span className="mb-2 block font-semibold">
              Cover Image <span className="text-[var(--thin-brighter-brighter)]">(10MB max)</span>
            </span>

            <div
              onClick={handleClickDropzone}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`w-full flex flex-col items-center justify-center border-2 border-[var(--thin)] hover:border-[var(--thin-brighter-brighter)] hover:border-dashed ${
                dragOver ? '' : 'border-[var(--thin)] bg-[var(--thin)]'
              } rounded-md p-4`}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              {(imagePreview || defaultImageUrl) ? (
                (imagePreview?.trim() || defaultImageUrl?.trim()) ? (
                  <>
                    <img
                      src={imagePreview?.trim() || defaultImageUrl?.trim() || undefined}
                      alt={imagePreview ? "Custom uploaded" : "Default from RAWG"}
                      className="max-h-48 max-w-full object-contain rounded-lg pointer-events-none select-none border-4 border-[var(--background)]"
                    />
                    {dragOver && (
                      <div className="absolute inset-0 bg-[var(--background)] z-10 flex items-center justify-center text-[var(--thin-brighter)] font-medium rounded">
                        Drop to upload custom image
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <img src="/logo/placeholder_img.png" alt="" />
                    <p className="italic text-[var(--text-thin)] text-center">
                      Drag an image here to upload a custom image or enter the game title to fetch the default image.
                  </p>
                  </>
                )
              ) : (
                <>
                  <img src="/logo/placeholder_img.png" alt="" className="max-w-10 w-full mb-2 mt-0.5"/>
                  <p className="italic text-[var(--text-thin)] text-center">
                    Drag an image here to upload a custom image or enter the game title to fetch the default image.
                  </p>
                </>
              )}
            </div>

            {/* Text below and outside the box, only if an image is showing */}
            {(imagePreview || defaultImageUrl) && (imagePreview?.trim() || defaultImageUrl?.trim()) && (
              <p className="mt-2 text-center text-[var(--thin-brighter)] italic">
                Click or drag an image into the box above to upload custom image.
              </p>
            )}

            {/* Hidden file input trigger */}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              ref={inputRef}
              onChange={handleFileChange}
            />
          </div>

          {/* Score */}
          <div className="block">
            <span className="mb-2 block">Score <span className="text-[var(--thin-brighter-brighter)]">(1-100)</span></span>
            <input
              type="number"
              name="score"
              value={formData.score}
              onChange={handleChange}
              min={0}
              max={100}
              className="w-full border-2 border-[var(--thin)] rounded-md py-2 px-3 focus:outline-none hover:border-[var(--thin-brighter)] focus:border-[var(--thin-brighter)]"
            />
          </div>

          {/* Categories */}
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`bg-blue-600 py-3 rounded-md font-semibold cursor-pointer
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

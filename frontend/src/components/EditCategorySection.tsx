import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { auth } from '../firebase';

type Category = {
  _id: string;
  name: string;
};

type EditCategorySectionProps = {
  onClose: () => void;
  onSave: () => void;
  onDeleteCategory: (id: string) => void;
};

function EditCategorySection({ onClose, onSave, onDeleteCategory }: EditCategorySectionProps) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingLoading, setEditingLoading] = useState(false);

  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<Category | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  async function getIdToken() {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');
    return await user.getIdToken(true);
  }

  useEffect(() => {
    async function fetchCategories() {
      setLoadingCategories(true);
      try {
        const token = await getIdToken();
        const res = await fetch(`${baseUrl}/api/categories`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data: Category[] = await res.json();
        setCategories(data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load categories');
      } finally {
        setLoadingCategories(false);
      }
    }
    fetchCategories();
  }, [baseUrl]);

  useEffect(() => {
    if (editingId && inputRef.current) {
      const input = inputRef.current;
      input.focus();
      // Set cursor position to the end of the current input value
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }
  }, [editingId]);

  // --- POST new category ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }
    if (name.length > 25) {
      toast.error('Category name cannot exceed 25 characters');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Adding category...');

    try {
      const token = await getIdToken();
      const user = auth.currentUser;
      if (!user) throw new Error('User not logged in');
      const uid = user.uid;

      const res = await fetch(`${baseUrl}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), uid }), // ✅ include user ID
      });

      if (!res.ok) throw new Error('Failed to add category');

      const newCategory = await res.json();
      toast.success('Category added', { id: toastId });
      setCategories((prev) => [...prev, newCategory]);
      setName('');

      onSave();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add category', { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  function requestDelete(cat: Category) {
    setPendingDeleteCategory(cat);
  }

  // In EditCategorySection.tsx
  async function handleDeleteConfirmed() {
    if (deleting || !pendingDeleteCategory) return;
    setDeleting(true);

    const id = pendingDeleteCategory._id;

    try {
      await onDeleteCategory(id);  // Parent deletes category on server
      setCategories((prev) => prev.filter((cat) => cat._id !== id)); // Remove locally
      setPendingDeleteCategory(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  function startEditing(cat: Category) {
    setEditingId(cat._id);
    setEditingName(cat.name);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName('');
  }

  // --- PUT update category ---
  async function saveEditing(id: string) {
    if (!editingName.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }
    if (editingName.length > 25) {
      toast.error('Category name cannot exceed 25 characters');
      return;
    }

    setEditingLoading(true);
    const toastId = toast.loading('Saving changes...');
    try {
      const token = await getIdToken();
      const res = await fetch(`${baseUrl}/api/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (!res.ok) throw new Error('Failed to update category');

      const updatedCategory = await res.json();
      setCategories((prev) =>
        prev.map((cat) => (cat._id === id ? updatedCategory : cat))
      );
      toast.success('Category updated', { id: toastId });
      cancelEditing();
      onSave();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update category', { id: toastId });
    } finally {
      setEditingLoading(false);
    }
  }

  return (
    <section
      className="w-full container mx-auto h-full overflow-auto pt-5"
      aria-modal="true"
      role="dialog"
      aria-labelledby="edit-category-title"
    >
      <div className="mx-auto w-fit">
        <button
          onClick={onClose}
          className="mb-6 bg-[var(--thin)] py-2 px-4 rounded-md cursor-pointer hover:bg-[var(--thin-brighter)]"
          aria-label="Go back to category list"
        >
          &larr; Go back
        </button>

        <h2 id="edit-category-title" className="text-3xl font-semibold mb-6">
          Add New Category
        </h2>

        <form
          onSubmit={handleSubmit}
          className="w-160 max-w-full flex flex-col gap-6"
        >
          <label className="block">
            <span className="mb-2 block">
              Category Name (25 characters max)
            </span>
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length > 25) {
                  toast.error('Category name cannot exceed 25 characters');
                  return;
                }
                setName(value);
              }}
              maxLength={26}
              placeholder="Enter category name"
              className="w-full border-2 border-[var(--thin)] rounded-md py-2 px-3 focus:outline-none hover:border-[var(--thin-brighter)] focus:border-[var(--thin-brighter)] hover:placeholder-[var(--text-thin)] placeholder-[var(--thin-brighter)] focus:placeholder-[var(--text-thin)] placeholder:italic"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className={`bg-blue-600 py-3 rounded-md text-white font-semibold cursor-pointer
              hover:bg-blue-500 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }
            `}
          >
            {loading ? 'Adding...' : 'Add category'}
          </button>
        </form>

        <h3 className="text-3xl font-semibold mb-6 mt-14">
          Existing Categories
        </h3>

        {loadingCategories ? (
          <p className="italic text-[var(--thin-brighter)]">Loading categories...</p>
        ) : categories.length === 0 ? (
          <p className="italic text-[var(--thin-brighter)]">No categories yet. Add one to begin categorizing your games.</p>
        ) : (
          <ul className="flex flex-col gap-3 w-full">
            {categories.map((cat) => (
              <li key={cat._id}>
                <div
                  className={`flex items-center justify-between border-2 rounded-md py-3 ps-4 pe-3 ${
                    editingId === cat._id
                      ? 'border-[var(--thin-brighter)]'
                      : 'border-[var(--thin)]'
                  }`}
                >
                  {editingId === cat._id ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length > 25) {
                          toast.error('Category name cannot exceed 25 characters');
                          return;
                        }
                        setEditingName(val);
                      }}
                      className="flex-grow hover:border-[var(--thin-brighter-brighter)] rounded-md focus:outline-none"
                      maxLength={26}
                    />
                  ) : (
                    <div className="flex-grow">{cat.name}</div>
                  )}

                  <div className="flex gap-2 ml-4">
                    {editingId === cat._id ? (
                      <>
                        <button
                          onClick={cancelEditing}
                          className={`text-white px-3 py-1 rounded cursor-pointer bg-[var(--thin)] hover:bg-[var(--thin-brighter)]`}
                          aria-label={`Cancel editing ${cat.name}`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEditing(cat._id)}
                          disabled={editingLoading}
                          className={`bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-500 cursor-pointer ${
                            editingLoading ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          aria-label={`Save changes to ${cat.name}`}
                        >
                          {editingLoading ? 'Saving...' : 'Save'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(cat)}
                          className="bg-[var(--thin)] text-white px-3 py-1 rounded hover:bg-[var(--thin-brighter)] cursor-pointer"
                          aria-label={`Edit ${cat.name}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => requestDelete(cat)}
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-500 cursor-pointer"
                          aria-label={`Delete ${cat.name}`}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pendingDeleteCategory &&
          createPortal(
            <div className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.32)] backdrop-blur-xs z-50">
              <div className="bg-[var(--background)] px-8 py-6 rounded-lg shadow-md text-center large-shadow-darker border-2 border-[var(--thin-brighter)] mx-4">
                <p className="text-lg mb-4 font-semibold">
                  Are you sure you want to delete "<strong>{pendingDeleteCategory.name}</strong>" category?
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleDeleteConfirmed}
                    disabled={deleting}
                    className={`bg-red-600 text-white px-6 py-2 rounded hover:bg-red-500 cursor-pointer ${
                      deleting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    aria-label={`Confirm delete category ${pendingDeleteCategory.name}`}
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    onClick={() => setPendingDeleteCategory(null)}
                    className="bg-[var(--thin-brighter)] px-6 py-2 rounded hover:bg-[#434B66] cursor-pointer"
                    aria-label="Cancel delete category"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        }
      </div>
    </section>
  );
}

export default EditCategorySection;

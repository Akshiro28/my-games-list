import { useState, useEffect } from 'react';
import axios from 'axios';
import CategorySidebar from '../components/CategorySidebar';
import CardGrid from '../components/CardGrid';
import EditGameSection from '../components/EditGameSection';
import EditCategorySection from '../components/EditCategorySection';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

import type { Category } from '../components/CategorySidebar';
import type { Card } from '../components/CardGrid';

const baseUrl = import.meta.env.VITE_API_BASE_URL;

function MainLayout() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);

  // Reusable function to reload categories from server and update state
  function refreshCategories() {
    axios
      .get(`${baseUrl}/api/categories`)
      .then(res => setCategories(res.data))
      .catch(err => console.error('Failed to fetch categories:', err));
  }

  function openCategoryEditor() {
    setEditingCategory(true);
  }

  function closeCategoryEditor() {
    setEditingCategory(false);
  }

  // Reload categories after add or update
  function handleCategorySave(closeAfterSave: boolean = true) {
    refreshCategories();
    if (closeAfterSave) {
      setEditingCategory(false);
    }
  }

  // Delete a category and update categories state by reloading fresh from server
  async function handleDeleteCategory(id: string) {
    const toastId = toast.loading('Deleting category...');

    try {
      const res = await axios.delete(`${baseUrl}/api/categories/${id}`);

      if (res.status === 200) {
        refreshCategories();
        toast.success('Category deleted!', { id: toastId });
      } else {
        toast.error('Failed to delete category.', { id: toastId });
      }
    } catch (err: any) {
      console.error('Error deleting category:', err);

      if (err.response?.status === 404) {
        toast.error('Category not found on server.', { id: toastId });
      } else {
        toast.error('Error deleting category.', { id: toastId });
      }
    }
  }

  // Fetch categories once on mount
  useEffect(() => {
    refreshCategories();
  }, []);

  // Fetch all cards once on mount
  const fetchCards = () => {
    axios
      .get(`${baseUrl}/api/cards`)
      .then(res => setCards(res.data))
      .catch(err => console.error('Failed to fetch cards:', err));
  };

  useEffect(() => {
    fetchCards();
  }, []);

  // Filter cards client-side based on selectedCategory
  const filteredCards = selectedCategory
    ? cards.filter(card => card.categories && card.categories.includes(selectedCategory))
    : cards;

  function handleEditClick(card: Card) {
    if (card._id === '-1' || card._id === '_new') {
      setEditingCard(card);
      setIsNew(true);
    } else {
      axios
        .get(`${baseUrl}/api/cards/${card._id}`)
        .then(res => {
          setEditingCard(res.data);
          setIsNew(false);
        })
        .catch(err => console.error('Failed to fetch card details:', err));
    }
  }

  function closeEditSection() {
    setEditingCard(null);
    setIsNew(false);
  }

  function handleSave() {
    fetchCards();
    closeEditSection();
  }

  function handleDelete(id: string) {
    const toastId = toast.loading('Deleting game entry...');

    fetch(`${baseUrl}/api/cards/${id}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (res.ok) {
          setCards(prevCards => prevCards.filter(card => card._id !== id));
          toast.success('Game deleted!', { id: toastId });
        } else {
          toast.error('Failed to delete game.', { id: toastId });
        }
      })
      .catch(err => {
        console.error('Delete failed', err);
        toast.error('An error occurred while deleting.', { id: toastId });
      });
  }

  return (
    <>
      <div
        className={`container mx-auto mt-31 flex h-[calc(100vh-236px)] w-[calc(100%-32px)] overflow-hidden relative main-layout-container ${
          editingCard || editingCategory ? 'editing' : ''
        }`}
      >
        <div className="main-layout flex w-full transition-all duration-800">
          <div className="card-grid">
            <CategorySidebar
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              onAddCategoryClick={openCategoryEditor}
            />
          </div>

          <div className="relative flex-1 overflow-hidden">
            <div className="card-grid absolute top-0 left-0 w-full h-full">
              <CardGrid
                cards={filteredCards}
                onEditClick={handleEditClick}
                onDelete={handleDelete}
              />
            </div>
          </div>
        </div>

        {!editingCategory && (
          <div
            className={`edit-section container absolute top-full w-full h-full bg-[var(--background)] transition-all duration-800 ease-in-out ${
              editingCard ? 'editing-active' : 'editing-inactive'
            }`}
          >
            {editingCard && (
              <EditGameSection
                card={editingCard}
                onClose={closeEditSection}
                onSave={handleSave}
                isNew={isNew}
              />
            )}
          </div>
        )}

        {!editingCard && (
          <div
            className={`edit-section container absolute top-full w-full h-full bg-[var(--background)] transition-all duration-800 ease-in-out ${
              editingCategory ? 'editing-active' : 'editing-inactive'
            }`}
            aria-modal="true"
            role="dialog"
          >
            {editingCategory && (
              <EditCategorySection
                onClose={closeCategoryEditor}
                onSave={() => handleCategorySave(false)}  // false = don't close after save
                onDeleteCategory={handleDeleteCategory}
              />
            )}
          </div>
        )}
      </div>

      <Toaster
        position="top-center"
        toastOptions={{ duration: 3000 }}
        containerStyle={{ top: '29px' }}
      />
    </>
  );
}

export default MainLayout;

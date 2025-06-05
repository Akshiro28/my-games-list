import { useState, useEffect } from 'react';
import axios from 'axios';
import GenreSidebar from '../components/GenreSidebar';
import CardGrid from '../components/CardGrid';
import EditGameSection from '../components/EditGameSection';
import EditCategorySection from '../components/EditCategorySection';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

import type { Genre } from '../components/GenreSidebar';
import type { Card } from '../components/CardGrid';

const baseUrl = import.meta.env.VITE_API_BASE_URL;

function MainLayout() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);

  function openCategoryEditor() {
    setEditingCategory(true);
  }

  function closeCategoryEditor() {
    setEditingCategory(false);
  }

  function handleCategorySave() {
    // Reload genres including the newly added one
    axios
      .get(`${baseUrl}/api/genres`)
      .then(res => setGenres(res.data))
      .catch(err => console.error('Failed to fetch genres:', err));

    setEditingCategory(false);
  }

  // Fetch genres once on mount
  useEffect(() => {
    axios
      .get(`${baseUrl}/api/genres`)
      .then(res => setGenres(res.data))
      .catch(err => console.error('Failed to fetch genres:', err));
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

  // Filter cards client-side based on selectedGenre
  const filteredCards = selectedGenre
    ? cards.filter(card => card.genres && card.genres.includes(selectedGenre))
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
            <GenreSidebar
              genres={genres}
              selectedGenre={selectedGenre}
              setSelectedGenre={setSelectedGenre}
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
                onSave={handleCategorySave}
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

import { useState, useEffect } from 'react';
import axios from 'axios';
import GenreSidebar from '../components/GenreSidebar';
import CardGrid from '../components/CardGrid';
import EditGameSection from '../components/EditGameSection';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

import type { Genre } from '../components/GenreSidebar';
import type { Card } from '../components/CardGrid';

function MainLayout() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/genres')
      .then(res => setGenres(res.data))
      .catch(err => console.error('Failed to fetch genres:', err));
  }, []);

  const fetchCards = () => {
    const url = selectedGenre
      ? `http://localhost:5000/api/cards?genre=${selectedGenre}`
      : `http://localhost:5000/api/cards`;

    axios
      .get(url)
      .then(res => setCards(res.data))
      .catch(err => console.error('Failed to fetch cards:', err));
  };

  useEffect(() => {
    fetchCards();
  }, [selectedGenre]);

  function handleEditClick(card: Card) {
    if (card._id === '-1' || card._id === '_new') {
      setEditingCard(card);
      setIsNew(true);
    } else {
      fetch(`http://localhost:5000/api/cards/${card._id}`)
        .then(res => res.json())
        .then(data => {
          setEditingCard(data);
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
    toast.success(isNew ? 'Game added successfully!' : 'Changes saved!');
    closeEditSection();
  }

  function handleDelete(id: string) {
    fetch(`http://localhost:5000/api/cards/${id}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (res.ok) {
          setCards(prevCards => prevCards.filter(card => card._id !== id));
          toast.success('Game deleted!');
        } else {
          toast.error('Failed to delete game.');
        }
      })
      .catch(err => {
        console.error('Delete failed', err);
        toast.error('An error occurred while deleting.');
      });
  }

  return (
    <>
      <div
        className={`container mx-auto mt-31 flex h-[calc(100vh-228px)] w-[calc(100%-32px)] overflow-hidden relative ${
          editingCard ? 'editing' : ''
        }`}
      >
        <div className="card-grid">
          <GenreSidebar
            genres={genres}
            selectedGenre={selectedGenre}
            setSelectedGenre={setSelectedGenre}
          />
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className="card-grid absolute top-0 left-0 w-full h-full">
            <CardGrid
              cards={cards}
              onEditClick={handleEditClick}
              onDelete={handleDelete}
            />
          </div>
        </div>

        <div
          className={`edit-section container absolute top-full left-[50%] translate-x-[-50%] w-fit h-full bg-[var(--background)] ${
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
      </div>

      <Toaster
        position="top-center"
        toastOptions={{ duration: 4000 }}
        containerStyle={{ top: '29px' }}
      />
    </>
  );
}

export default MainLayout;

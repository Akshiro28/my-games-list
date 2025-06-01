import { useState, useEffect } from 'react';
import axios from 'axios';
import GenreSidebar from '../components/GenreSidebar';
import CardGrid from '../components/CardGrid';
import EditGameSection from '../components/EditGameSection';

type Card = {
  id: number;
  title: string;
  description: string;
  image_path: string;
  score: number;
};

function MainLayout() {
  const [genres, setGenres] = useState([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  function toggleIsEditing() {
    setIsEditing(prev => !prev);
  }

  useEffect(() => {
    axios.get('http://localhost:5000/api/genres').then(res => {
      setGenres(res.data);
    }).catch(err => {
      console.error('Failed to fetch genres:', err);
    });
  }, []);

  useEffect(() => {
    const url = selectedGenre ? `http://localhost:5000/api/cards?genre=${selectedGenre}` : 'http://localhost:5000/api/cards';
    axios.get(url).then(res => setCards(res.data));
  }, [selectedGenre]);

  function handleEditClick(card: Card) {
    setEditingCard(card);
  }

  function closeEditSection() {
    setEditingCard(null);
  }

  function handleSave(updatedCard: Card) {
    setCards(prevCards => prevCards.map(c => c.id === updatedCard.id ? updatedCard : c));
    closeEditSection();
  }

  return (
    <div className={`container mx-auto mt-26 flex h-[calc(100vh-208px)] py-5 overflow-hidden relative ${editingCard ? 'editing' : ''}`}>
      <div className="card-grid overflow-hidden">
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
            isEditing={isEditing}
            onEditClick={handleEditClick}
            setIsEditing={toggleIsEditing}
          />
        </div>
      </div>

      <div className="edit-section container absolute top-full left-0 w-full h-full bg-[var(--background)]">
          <EditGameSection
            card={editingCard}
            onClose={closeEditSection}
            onSave={handleSave}
          />
        </div>
    </div>
  );
}

export default MainLayout;

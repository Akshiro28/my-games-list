import { useState, useEffect } from 'react';
import axios from 'axios';
import GenreSidebar from '../components/GenreSidebar';
import CardGrid from '../components/CardGrid';

function MainLayout() {
  const [genres, setGenres] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);

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

  return (
    <div className="container mx-auto mt-26 flex h-[calc(100vh-208px)] py-5 overflow-y-scroll">
      <GenreSidebar
        genres={genres}
        selectedGenre={selectedGenre}
        setSelectedGenre={setSelectedGenre}
      />
      <CardGrid cards={cards} />
    </div>
  );
}

export default MainLayout;

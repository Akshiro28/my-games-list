type Card = {
  id: number;
  title: string;
  description: string;
  image_path: string;
  score: number;
};

type CardGridProps = {
  cards: Card[];
};


function CardGrid({ cards }: CardGridProps) {
  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-6">Cards</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.id} className="bg-white rounded-lg shadow p-4">
            <img
              src={card.image_path}
              alt={card.title}
              className="w-full h-40 object-cover rounded mb-3"
            />
            <h3 className="text-lg font-semibold">{card.title}</h3>
            <p className="text-sm text-gray-600">{card.description}</p>
            <p className="text-sm text-gray-800 mt-1">Score: {card.score}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

export default CardGrid;

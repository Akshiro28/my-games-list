require('dotenv').config(); // Load env vars from .env

const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Env vars
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

if (!uri) {
  console.error('ERROR: MONGODB_URI environment variable not set.');
  process.exit(1);
}

if (!dbName) {
  console.error('ERROR: DB_NAME environment variable not set.');
  process.exit(1);
}

// MongoDB setup
const client = new MongoClient(uri);

let db;
let cardsCollection;
let genresCollection;

async function connectDB() {
  try {
    await client.connect();
    db = client.db(dbName);
    cardsCollection = db.collection('cards');
    genresCollection = db.collection('genres');
    console.log(`✅ Connected to MongoDB database: ${dbName}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

connectDB();

// --- GENRES ROUTES ---

// GET all genres
app.get('/api/genres', async (req, res) => {
  try {
    const genres = await genresCollection.find({}).toArray();
    res.json(genres);
  } catch (err) {
    console.error('Failed to get genres:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- CARDS ROUTES ---

// GET all cards (optionally filtered by genre)
app.get('/api/cards', async (req, res) => {
  try {
    const genreId = req.query.genre;
    const filter = genreId ? { genres: genreId } : {};
    const cards = await cardsCollection.find(filter).toArray();
    res.json(cards);
  } catch (err) {
    console.error('Failed to get cards:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET card by ID
app.get('/api/cards/:id', async (req, res) => {
  const cardId = req.params.id;
  if (!ObjectId.isValid(cardId)) {
    return res.status(400).json({ error: 'Invalid card ID' });
  }

  try {
    const card = await cardsCollection.findOne({ _id: new ObjectId(cardId) });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(card);
  } catch (err) {
    console.error('Failed to get card by ID:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST create new card
app.post('/api/cards', async (req, res) => {
  const { name, image, score, description, genres } = req.body;

  if (!name || !image || !score || !description || !Array.isArray(genres)) {
    return res.status(400).json({ error: 'Missing required fields or genres must be an array' });
  }

  try {
    const newCard = {
      name,
      image,
      score,
      description,
      genres,
      createdAt: new Date(),
    };

    const result = await cardsCollection.insertOne(newCard);
    res.status(201).json({ message: 'Card created', id: result.insertedId });
  } catch (err) {
    console.error('Failed to add card:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT update card
app.put('/api/cards/:id', async (req, res) => {
  const cardId = req.params.id;
  if (!ObjectId.isValid(cardId)) {
    return res.status(400).json({ error: 'Invalid card ID' });
  }

  const { name, image, score, description, genres } = req.body;
  if (!name || !image || !score || !description || !Array.isArray(genres)) {
    return res.status(400).json({ error: 'Missing required fields or genres must be an array' });
  }

  try {
    const updatedCard = {
      name,
      image,
      score,
      description,
      genres,
      updatedAt: new Date(),
    };

    const result = await cardsCollection.updateOne(
      { _id: new ObjectId(cardId) },
      { $set: updatedCard }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ message: 'Card updated' });
  } catch (err) {
    console.error('Failed to update card:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE card
app.delete('/api/cards/:id', async (req, res) => {
  const cardId = req.params.id;
  if (!ObjectId.isValid(cardId)) {
    return res.status(400).json({ error: 'Invalid card ID' });
  }

  try {
    const result = await cardsCollection.deleteOne({ _id: new ObjectId(cardId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ message: 'Card deleted' });
  } catch (err) {
    console.error('Failed to delete card:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- SERVER START ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/api`);
});

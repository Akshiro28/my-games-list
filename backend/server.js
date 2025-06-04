require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();
const port = process.env.PORT || 5000;

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(cors());
app.use(express.json());

let db, cardsCollection, genresCollection;

async function start() {
  const client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  cardsCollection = db.collection('cards');
  genresCollection = db.collection('genres');

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start().catch(console.error);

// --- ROUTES ---

// Get all cards
app.get('/api/cards', async (req, res) => {
  try {
    const cards = await cardsCollection.find().toArray();
    res.json(cards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Get card by ID
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
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

// Get all genres
app.get('/api/genres', async (req, res) => {
  try {
    const genres = await genresCollection.find().toArray();
    res.json(genres);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

// Create new card
app.post('/api/cards', async (req, res) => {
  try {
    const card = req.body;

    // Insert card with genres as array of genre IDs (strings)
    const result = await cardsCollection.insertOne(card);
    res.status(201).json({ _id: result.insertedId, ...card });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Update card by id
app.put('/api/cards/:id', async (req, res) => {
  const cardId = req.params.id;

  if (!ObjectId.isValid(cardId)) {
    return res.status(400).json({ error: 'Invalid card ID' });
  }

  try {
    const updatedCard = req.body;

    const result = await cardsCollection.findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $set: updatedCard },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json(result.value);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// DELETE card by id (with Cloudinary image deletion)
app.delete('/api/cards/:id', async (req, res) => {
  const cardId = req.params.id;

  if (!ObjectId.isValid(cardId)) {
    return res.status(400).json({ error: 'Invalid card ID' });
  }

  try {
    // Find the card first
    const card = await cardsCollection.findOne({ _id: new ObjectId(cardId) });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Delete image from Cloudinary if public_id exists
    if (card.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(card.cloudinaryPublicId);
        console.log(`Deleted image from Cloudinary: ${card.cloudinaryPublicId}`);
      } catch (cloudErr) {
        console.error('Failed to delete image from Cloudinary:', cloudErr);
        // Not throwing here so DB still deletes even if image deletion fails
      }
    }

    // Delete the card from DB
    const result = await cardsCollection.deleteOne({ _id: new ObjectId(cardId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Card not found or already deleted' });
    }

    res.json({ message: 'Card and image deleted successfully' });
  } catch (err) {
    console.error('Failed to delete card:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- New route to delete an image from Cloudinary by public ID ---
app.post('/api/images/delete', async (req, res) => {
  const { publicId } = req.body;

  if (!publicId) {
    return res.status(400).json({ error: 'Missing publicId in request body' });
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== 'ok' && result.result !== 'not found') {
      // Treat 'not found' as success, otherwise error
      return res.status(500).json({ error: 'Failed to delete image from Cloudinary', details: result });
    }

    res.json({ message: 'Image deleted successfully', result });
  } catch (err) {
    console.error('Cloudinary delete error:', err);
    res.status(500).json({ error: 'Internal server error deleting image' });
  }
});

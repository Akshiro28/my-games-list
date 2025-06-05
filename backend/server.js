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

start().catch(console.error());

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
    const result = await cardsCollection.insertOne(card);
    res.status(201).json({ _id: result.insertedId, ...card });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Create new genre
app.post('/api/genres', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await genresCollection.insertOne({ name: name.trim() });
    res.status(201).json({ _id: result.insertedId, name: name.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create genre' });
  }
});

// Update card
app.put('/api/cards/:id', async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid card ID' });
  }

  try {
    const result = await cardsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const updatedCard = await cardsCollection.findOne({ _id: new ObjectId(id) });
    res.json(updatedCard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Update genre
app.put('/api/genres/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }

  try {
    const result = await genresCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const updatedCategory = await genresCollection.findOne({ _id: new ObjectId(id) });
    res.json(updatedCategory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update category' });
  }
});

// Delete card
app.delete('/api/cards/:id', async (req, res) => {
  const cardId = req.params.id;

  if (!ObjectId.isValid(cardId)) {
    return res.status(400).json({ error: 'Invalid card ID' });
  }

  try {
    const card = await cardsCollection.findOne({ _id: new ObjectId(cardId) });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (card.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(card.cloudinaryPublicId);
        console.log(`Deleted image from Cloudinary: ${card.cloudinaryPublicId}`);
      } catch (cloudErr) {
        console.error('Failed to delete image from Cloudinary:', cloudErr);
      }
    }

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

// Delete genre (UPDATED to also clean up cards referencing this genre)
app.delete('/api/genres/:id', async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid genre ID' });
  }

  try {
    // Delete genre document
    const result = await genresCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Genre not found' });
    }

    // Remove the deleted genre's ID from all cards referencing it
    await cardsCollection.updateMany(
      { genres: new ObjectId(id) },
      { $pull: { genres: new ObjectId(id) } }
    );

    res.status(200).json({ message: 'Genre deleted and references cleaned up' });
  } catch (error) {
    console.error('Delete genre error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete image from Cloudinary
app.post('/api/images/delete', async (req, res) => {
  const { publicId } = req.body;

  if (!publicId) {
    return res.status(400).json({ error: 'Missing publicId in request body' });
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== 'ok' && result.result !== 'not found') {
      return res.status(500).json({ error: 'Failed to delete image from Cloudinary', details: result });
    }

    res.json({ message: 'Image deleted successfully', result });
  } catch (err) {
    console.error('Cloudinary delete error:', err);
    res.status(500).json({ error: 'Internal server error deleting image' });
  }
});

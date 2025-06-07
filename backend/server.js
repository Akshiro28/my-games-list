require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const authenticate = require('./authMiddleware');
const admin = require('firebase-admin');

// Firebase Admin SDK setup
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Express setup
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB & Cloudinary setup
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

let db, cardsCollection, categoriesCollection, usersCollection;

async function start() {
  try {
    const client = new MongoClient(uri);
    await client.connect();

    db = client.db(dbName);
    cardsCollection = db.collection('cards');
    categoriesCollection = db.collection('categories');
    usersCollection = db.collection('users');

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}

start();


// --- ROUTES ---

// Test route
app.get('/api/protected', authenticate, (req, res) => {
  res.json({ message: 'You are authenticated!', user: req.user });
});

// Save/update authenticated user
app.post('/api/save-user', authenticate, async (req, res) => {
  const { uid, email, name, picture } = req.user;

  try {
    await usersCollection.updateOne(
      { uid },
      {
        $set: {
          email: email || '',
          name: name || '',
          picture: picture || '',
          lastLogin: new Date(),
        },
        $setOnInsert: {
          uid,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
    res.status(200).json({ message: 'User saved successfully' });
  } catch (err) {
    console.error('Error saving user:', err);
    res.status(500).json({ error: 'Failed to save user' });
  }
});

// Get cards for authenticated user
app.get('/api/cards', authenticate, async (req, res) => {
  const uid = req.user.uid;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const skip = (page - 1) * limit;

  try {
    const cards = await cardsCollection.find({ uid }).skip(skip).limit(limit).toArray();
    res.json(cards);
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Get single card
app.get('/api/cards/:id', authenticate, async (req, res) => {
  const uid = req.user.uid;
  const { id } = req.params;

  if (!ObjectId.isValid(id))
    return res.status(400).json({ error: 'Invalid card ID' });

  try {
    const card = await cardsCollection.findOne({ _id: new ObjectId(id), uid });
    if (!card) return res.status(404).json({ error: 'Card not found or access denied' });
    res.json(card);
  } catch (err) {
    console.error('Error fetching card:', err);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

// Create card
app.post('/api/cards', authenticate, async (req, res) => {
  const uid = req.user.uid;
  const card = { ...req.body, uid, createdAt: new Date() };

  try {
    const result = await cardsCollection.insertOne(card);
    res.status(201).json({ _id: result.insertedId, ...card });
  } catch (err) {
    console.error('Error creating card:', err);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Update card
app.put('/api/cards/:id', authenticate, async (req, res) => {
  const uid = req.user.uid;
  const { id } = req.params;
  const updatedData = req.body;

  if (!ObjectId.isValid(id))
    return res.status(400).json({ error: 'Invalid card ID' });

  try {
    const result = await cardsCollection.updateOne(
      { _id: new ObjectId(id), uid },
      { $set: updatedData }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ error: 'Card not found or access denied' });

    const updatedCard = await cardsCollection.findOne({ _id: new ObjectId(id), uid });
    res.json(updatedCard);
  } catch (err) {
    console.error('Error updating card:', err);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Delete card and Cloudinary image
app.delete('/api/cards/:id', authenticate, async (req, res) => {
  const uid = req.user.uid;
  const { id } = req.params;

  if (!ObjectId.isValid(id))
    return res.status(400).json({ error: 'Invalid card ID' });

  try {
    const card = await cardsCollection.findOne({ _id: new ObjectId(id), uid });
    if (!card)
      return res.status(404).json({ error: 'Card not found or access denied' });

    await cardsCollection.deleteOne({ _id: new ObjectId(id), uid });

    if (card.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(card.cloudinaryPublicId);
    }

    res.status(200).json({ message: 'Card and image deleted successfully' });
  } catch (err) {
    console.error('Error deleting card:', err);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Get categories for authenticated user
app.get('/api/categories', authenticate, async (req, res) => {
  const uid = req.user.uid;

  try {
    const categories = await categoriesCollection.find({ uid }).toArray();
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
app.post('/api/categories', authenticate, async (req, res) => {
  const uid = req.user.uid;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const category = { name: name.trim(), uid, createdAt: new Date() };
    const result = await categoriesCollection.insertOne(category);
    res.status(201).json({ _id: result.insertedId, ...category });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
app.put('/api/categories/:id', authenticate, async (req, res) => {
  const uid = req.user.uid;
  const { id } = req.params;
  const { name } = req.body;

  if (!ObjectId.isValid(id))
    return res.status(400).json({ error: 'Invalid category ID' });

  try {
    const result = await categoriesCollection.updateOne(
      { _id: new ObjectId(id), uid },
      { $set: { name } }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ error: 'Category not found or access denied' });

    const updatedCategory = await categoriesCollection.findOne({ _id: new ObjectId(id), uid });
    res.json(updatedCategory);
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
app.delete('/api/categories/:id', authenticate, async (req, res) => {
  try {
    await db.collection('categories').deleteOne({ _id: new ObjectId(req.params.id), uid: req.user.uid });
    res.status(200).json({ message: 'Category deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

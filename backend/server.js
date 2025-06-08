require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { authenticate, authenticateOptional } = require('./authMiddleware');
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
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.json({ message: 'You are authenticated!', user: req.user });
});

// Save/update authenticated user
app.post('/api/save-user', authenticate, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
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

// GET cards with optional auth
app.get("/api/cards", authenticateOptional, async (req, res) => {
  try {
    let userId;

    if (req.user) {
      console.log("Authenticated user:", req.user.email);
      userId = req.user.uid;
    } else {
      console.log("No user authenticated. Looking for template user.");
      const templateUser = await usersCollection.findOne({ email: "joviantogodjali@gmail.com" });
      if (!templateUser) {
        console.log("Template user not found");
        return res.status(404).json({ error: "Template user not found" });
      }
      console.log("Found template user:", templateUser.email);
      userId = templateUser.uid;
    }

    const cards = await cardsCollection.find({ uid: userId }).toArray();
    console.log(`Returning ${cards.length} cards for uid: ${userId}`);
    res.json(cards);
  } catch (error) {
    console.error("Failed to fetch cards:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single card (strict auth)
app.get('/api/cards/:id', authenticate, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
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

// Create card (strict auth)
app.post('/api/cards', authenticate, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
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

// Update card (strict auth)
app.put('/api/cards/:id', authenticate, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
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

// Delete card (strict auth)
app.delete('/api/cards/:id', authenticate, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
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

// Categories routes (strict auth)
app.get('/api/categories', authenticateOptional, async (req, res) => {
  try {
    let uid;

    if (req.query.uid === 'template' || !req.user) {
      const templateUser = await usersCollection.findOne({ email: "joviantogodjali@gmail.com" });
      if (!templateUser) {
        return res.status(404).json({ error: "Template user not found" });
      }
      uid = templateUser.uid;
    } else {
      uid = req.user.uid;
    }

    const categories = await categoriesCollection.find({ uid }).toArray();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error fetching categories' });
  }
});

app.post('/api/categories', authenticate, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const uid = req.user.uid;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Category name is required' });
  }

  try {
    const category = { name, uid, createdAt: new Date() };
    const result = await categoriesCollection.insertOne(category);
    res.status(201).json({ _id: result.insertedId, ...category });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

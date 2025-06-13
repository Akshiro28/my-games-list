require('dotenv').config();
const axios = require('axios');
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

    // 0. Explicit template override
    if (req.query.uid === "template") {
      const templateUser = await usersCollection.findOne({ email: "joviantogodjali@gmail.com" });
      if (!templateUser) {
        return res.status(404).json({ error: "Template user not found" });
      }
      userId = templateUser.uid;
    }

    // 1. Check if `username` query param is provided
    else if (req.query.username) {
      const user = await usersCollection.findOne({ username: req.query.username });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      userId = user.uid;
    }

    // 2. If logged in, use logged-in user UID
    else if (req.user) {
      userId = req.user.uid;
    }

    // 3. Fallback to template user
    else {
      const templateUser = await usersCollection.findOne({ email: "joviantogodjali@gmail.com" });
      if (!templateUser) {
        return res.status(404).json({ error: "Template user not found" });
      }
      userId = templateUser.uid;
    }

    const cards = await cardsCollection.find({ uid: userId }).toArray();
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
    // Check for duplicate title (case-insensitive) for this user
    const existing = await cardsCollection.findOne({
      uid,
      name: { $regex: `^${card.name}$`, $options: "i" }
    });

    if (existing) {
      return res.status(400).json({ message: "You already have a game with this title." });
    }

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
    // Check for duplicate title (case-insensitive) that is NOT the current card
    const duplicate = await cardsCollection.findOne({
      uid,
      name: { $regex: `^${updatedData.name}$`, $options: "i" },
      _id: { $ne: new ObjectId(id) }
    });

    if (duplicate) {
      return res.status(400).json({ message: "Another game with this title already exists." });
    }

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

app.put('/api/categories/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const uid = req.user.uid;

  try {
    const result = await db.collection('categories').findOneAndUpdate(
      { _id: new ObjectId(id), uid },
      { $set: { name } },
      { returnDocument: 'after' } // returns the updated document
    );

    if (!result.value) {
      return res.status(404).json({ message: 'Category not found or not updated' });
    }

    res.json(result.value);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Server error' });
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

app.delete('/api/categories/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const uid = req.user.uid;

  try {
    const categoryId = new ObjectId(id);

    // Delete the category document
    const deleteResult = await db.collection('categories').deleteOne({
      _id: categoryId,
      uid,
    });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ message: 'Category not found or unauthorized' });
    }

    // Remove the category ID string from cards
    const updateResult = await db.collection('cards').updateMany(
      {
        uid,
        categories: id, // compare as string
      },
      {
        $pull: { categories: id },
      }
    );

    res.status(200).json({
      message: 'Category deleted and references removed from games',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Categories routes (strict auth)
app.get('/api/categories', authenticateOptional, async (req, res) => {
  try {
    let uid;

    // 0. Explicit template override
    if (req.query.uid === 'template') {
      const templateUser = await usersCollection.findOne({ email: "joviantogodjali@gmail.com" });
      if (!templateUser) {
        return res.status(404).json({ error: "Template user not found" });
      }
      uid = templateUser.uid;
    }

    // 1. Use `username` if provided
    else if (req.query.username) {
      const user = await usersCollection.findOne({ username: req.query.username });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      uid = user.uid;
    }

    // 2. Use authenticated UID
    else if (req.user) {
      uid = req.user.uid;
    }

    // 3. Fallback to template
    else {
      const templateUser = await usersCollection.findOne({ email: "joviantogodjali@gmail.com" });
      if (!templateUser) {
        return res.status(404).json({ error: "Template user not found" });
      }
      uid = templateUser.uid;
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

app.post('/api/images/delete', authenticate, async (req, res) => {
  const { publicId } = req.body;

  if (!publicId) {
    return res.status(400).json({ error: 'publicId is required' });
  }

  try {
    await cloudinary.uploader.destroy(publicId);
    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Cloudinary delete error:', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

app.get('/api/users/get-by-uid', async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ message: "Missing uid" });

    const user = await db.collection('users').findOne({ uid });

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("GET /api/users/get-by-uid error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Create a new user with username normalized to lowercase
app.post('/api/users', authenticate, async (req, res) => {
  try {
    const { uid, email, name, picture, username } = req.body;

    if (!uid || !username) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if username already exists in DB
    const existing = await db.collection('users').findOne({ username });
    if (existing) {
      return res.status(409).json({ message: "Username already taken" });
    }

    // Insert or update user
    const user = await db.collection('users').updateOne(
      { uid },
      { $set: { email, name, picture, username } },
      { upsert: true }
    );

    res.json({ uid, email, name, picture, username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Check if username is taken (case-insensitive)
app.get('/api/users/check-username', async (req, res) => {
  const username = req.query.username;
  if (!username) {
    return res.status(400).json({ error: 'Username query parameter is required' });
  }

  try {
    // Case-insensitive search using regex
    const user = await usersCollection.findOne({ 
      username: { $regex: `^${username}$`, $options: 'i' }
    });
    
    if (user) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking username:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/users/me', authenticate, async (req, res) => {
  const { uid } = req.user;
  const user = await db.collection('users').findOne({ uid });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user); // includes `username`
});

app.get('/api/users/exists/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const user = await db.collection('users').findOne({ username });

    res.json({ exists: !!user });
  } catch (err) {
    console.error('Error checking username:', err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/api/suggestions', async (req, res) => {
  const query = req.query.query;

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  const rawgApiKey = process.env.RAWG_API_KEY;
  if (!rawgApiKey) {
    console.error('RAWG_API_KEY is missing in environment variables.');
    return res.status(500).json({ error: 'RAWG API key not configured' });
  }

  try {
    const response = await axios.get('https://api.rawg.io/api/games', {
      params: {
        key: rawgApiKey,
        search: query,
        page_size: 10,
      },
    });

    const suggestions = response.data.results?.map((game) => ({
      title: game.name,
      image: game.background_image,
    })) || [];

    res.json(suggestions);
  } catch (error) {
    console.error('RAWG fetch error:', error.message);
    if (error.response) {
      console.error('RAWG error status:', error.response.status);
      console.error('RAWG error body:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

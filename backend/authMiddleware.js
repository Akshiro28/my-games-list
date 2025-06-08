const admin = require("./firebaseAdmin");
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DB_NAME);

    // Ensure unique index on uid (run once)
    await db.collection("users").createIndex({ uid: 1 }, { unique: true });
  }
  return db;
}

// ------------------------------
// Required authentication
// ------------------------------
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = {
      uid: decodedToken.uid,
      name: decodedToken.name || '',
      email: decodedToken.email || '',
      picture: decodedToken.picture || '',
    };

    const db = await connectDB();
    const usersCollection = db.collection("users");

    await usersCollection.updateOne(
      { uid: decodedToken.uid },
      {
        $set: {
          name: decodedToken.name || '',
          email: decodedToken.email || '',
          picture: decodedToken.picture || '',
          lastLogin: new Date(),
        },
        $setOnInsert: {
          uid: decodedToken.uid,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
}

// ------------------------------
// Optional authentication
// ------------------------------
async function authenticateOptional(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null; // No token — treat as guest
    return next();
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = {
      uid: decodedToken.uid,
      name: decodedToken.name || '',
      email: decodedToken.email || '',
      picture: decodedToken.picture || '',
    };

    const db = await connectDB();
    const usersCollection = db.collection("users");

    await usersCollection.updateOne(
      { uid: decodedToken.uid },
      {
        $set: {
          name: decodedToken.name || '',
          email: decodedToken.email || '',
          picture: decodedToken.picture || '',
          lastLogin: new Date(),
        },
        $setOnInsert: {
          uid: decodedToken.uid,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    next();
  } catch (error) {
    console.warn("Optional auth failed, treating as guest:", error?.message || error);
    req.user = null;
    next(); // Continue without throwing error
  }
}

module.exports = {
  authenticate,
  authenticateOptional,
  connectDB,
};

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

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
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

    // Use atomic upsert to save or update user info safely
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

module.exports = authenticate;

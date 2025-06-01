require('dotenv').config({ path: '../../.env' });

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ Connected to MySQL database');
});

// Routes

// Get all cards
app.get('/api/cards', (req, res) => {
  db.query('SELECT * FROM cards', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database query failed' });
    }
    res.json(results);
  });
});

// Get card by ID
app.get('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM cards WHERE id = ?';

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error fetching card:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(results[0]);
  });
});

// Get all genres
app.get('/api/genres', (req, res) => {
  db.query('SELECT * FROM genres', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database query failed' });
    }
    res.json(results);
  });
});

// Update card with genres
app.put('/api/cards/:id', (req, res) => {
  const gameId = req.params.id;
  const { title, image_path, score, description, genres } = req.body;

  if (!title || !image_path || typeof score !== 'number' || !description || !Array.isArray(genres)) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  db.beginTransaction(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Transaction error' });
    }

    // 1. Update card info
    const updateCardQuery = `
      UPDATE cards
      SET title = ?, image_path = ?, score = ?, description = ?
      WHERE id = ?
    `;

    db.query(updateCardQuery, [title, image_path, score, description, gameId], (err) => {
      if (err) {
        return db.rollback(() => {
          console.error(err);
          res.status(500).json({ error: 'Failed to update card' });
        });
      }

      // 2. Delete old genre links
      db.query('DELETE FROM card_genres WHERE card_id = ?', [gameId], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error(err);
            res.status(500).json({ error: 'Failed to delete old genres' });
          });
        }

        // 3. Insert new genre relationships
        const insertGenreQuery = `
          INSERT INTO card_genres (card_id, genre_id) VALUES ?
        `;
        const values = genres.map(genreId => [gameId, genreId]);

        if (values.length === 0) {
          // No genres to insert, just commit
          return db.commit(err => {
            if (err) {
              return db.rollback(() => {
                console.error(err);
                res.status(500).json({ error: 'Commit failed' });
              });
            }
            res.json({ message: 'Card updated with no genres' });
          });
        }

        db.query(insertGenreQuery, [values], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error(err);
              res.status(500).json({ error: 'Failed to insert genres' });
            });
          }

          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                console.error(err);
                res.status(500).json({ error: 'Commit failed' });
              });
            }
            res.json({ message: 'Card updated successfully' });
          });
        });
      });
    });
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});

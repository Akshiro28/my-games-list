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
  console.log('Connected to MySQL database');
});

// get all cards, optionally filtered by genre
app.get('/api/cards', (req, res) => {
  const genreId = req.query.genre;

  if (genreId) {
    // Filter cards by genre
    const query = `
      SELECT c.*
      FROM cards c
      JOIN card_genres cg ON c.id = cg.card_id
      WHERE cg.genre_id = ?
    `;

    db.query(query, [genreId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query failed' });
      }
      res.json(results);
    });
  } else {
    // Return all cards
    db.query('SELECT * FROM cards', (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query failed' });
      }
      res.json(results);
    });
  }
});

// Get card by ID with associated genres
app.get('/api/cards/:id', (req, res) => {
  const { id } = req.params;

  const cardQuery = 'SELECT * FROM cards WHERE id = ?';
  const genreQuery = `
    SELECT genre_id FROM card_genres WHERE card_id = ?
  `;

  db.query(cardQuery, [id], (err, cardResults) => {
    if (err || cardResults.length === 0) {
      return res.status(500).json({ error: 'Card not found or query failed' });
    }

    const card = cardResults[0];

    db.query(genreQuery, [id], (err, genreResults) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get genres' });
      }

      card.genres = genreResults.map(g => g.genre_id); // Add genres array to the card
      res.json(card);
    });
  });
});

// get all genres
app.get('/api/genres', (req, res) => {
  db.query('SELECT * FROM genres', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database query failed' });
    }
    res.json(results);
  });
});

// update card with genres
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

    // 1. update card info
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

      // 2. delete old genre links
      db.query('DELETE FROM card_genres WHERE card_id = ?', [gameId], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error(err);
            res.status(500).json({ error: 'Failed to delete old genres' });
          });
        }

        // 3. insert new genre relationships
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

// create new card with genres
app.post('/api/cards', (req, res) => {
  const { title, image_path, score, description, genres } = req.body;

  if (!title || !image_path || typeof score !== 'number' || !description || !Array.isArray(genres)) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  db.beginTransaction(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Transaction error' });
    }

    // 1. insert new card
    const insertCardQuery = `
      INSERT INTO cards (title, image_path, score, description)
      VALUES (?, ?, ?, ?)
    `;

    db.query(insertCardQuery, [title, image_path, score, description], (err, result) => {
      if (err) {
        return db.rollback(() => {
          console.error(err);
          res.status(500).json({ error: 'Failed to insert card' });
        });
      }

      const newCardId = result.insertId;

      // 2. insert genre relations
      if (genres.length === 0) {
        // no genres, just commit
        return db.commit(err => {
          if (err) {
            return db.rollback(() => {
              console.error(err);
              res.status(500).json({ error: 'Commit failed' });
            });
          }
          // Return new card info with empty genres array
          res.status(201).json({ id: newCardId, title, image_path, score, description, genres: [] });
        });
      }

      const insertGenreQuery = `
        INSERT INTO card_genres (card_id, genre_id) VALUES ?
      `;
      const values = genres.map(genreId => [newCardId, genreId]);

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

          res.status(201).json({ id: newCardId, title, image_path, score, description, genres });
        });
      });
    });
  });
});

// delete card and its genre associations
app.delete('/api/cards/:id', (req, res) => {
  const { id } = req.params;

  db.beginTransaction(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Transaction error' });
    }

    // 1. Delete genre associations
    db.query('DELETE FROM card_genres WHERE card_id = ?', [id], (err) => {
      if (err) {
        return db.rollback(() => {
          console.error(err);
          res.status(500).json({ error: 'Failed to delete genre relations' });
        });
      }

      // 2. Delete the card itself
      db.query('DELETE FROM cards WHERE id = ?', [id], (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error(err);
            res.status(500).json({ error: 'Failed to delete card' });
          });
        }

        if (result.affectedRows === 0) {
          return db.rollback(() => {
            res.status(404).json({ error: 'Card not found' });
          });
        }

        db.commit(err => {
          if (err) {
            return db.rollback(() => {
              console.error(err);
              res.status(500).json({ error: 'Commit failed' });
            });
          }

          res.status(204).send(); // No content
        });
      });
    });
  });
});

// start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

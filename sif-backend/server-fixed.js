const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

const SECRET_KEY = process.env.JWT_SECRET || 'votre_cle_secrete';

// Configuration CORS adaptée à l'environnement
if (process.env.NODE_ENV === 'production') {
  // En production, même domaine donc pas besoin de CORS
  app.use(cors({
    origin: true,
    credentials: true
  }));
} else {
  // En développement, autoriser localhost:3000
  app.use(cors());
}

app.use(express.json()); // Pour parser le JSON dans les requêtes POST

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Remplacer la génération dynamique du hash par l'utilisation d'un hash stocké dans .env
const ADMIN_USER = {
  username: 'admin',
  passwordHash: process.env.ADMIN_HASH // Stocke ici le hash généré une seule fois
};

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// === ROUTES API ===

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USER.username) {
    return res.status(401).json({ error: 'Nom d utilisateur incorrect' });
  }

  // Comparaison sécurisée avec le hash stocké
  const validPassword = await bcrypt.compare(password, ADMIN_USER.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '2h' });
  res.json({ token });
});

app.get('/api/points', async (req, res) => {
  const nameQuery = req.query.name;

  if (!nameQuery) {
    return res.status(400).json({ error: 'Paramètre "name" manquant dans la requête' });
  }

  try {
    await client.connect();
    const db = client.db('SIF');
    const collection = db.collection('PK');

    const results = await collection
      .find({ "Points remarquables ": { $regex: nameQuery, $options: 'i' } })
      .toArray();

    res.json(results);
  } catch (error) {
    console.error('Erreur lors de la récupération des points :', error);
    res.status(500).send('Erreur serveur');
  }
});

app.get('/api/all-points', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('SIF'); 
    const results = await db.collection('PK').find({}).toArray();
    res.json(results);
  } catch (error) {
    console.error('Erreur lors de la récupération de tous les points :', error);
    res.status(500).send('Erreur serveur');
  }
});

app.get('/api/pkdata', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('SIF');
    const pkPoints = await db.collection('PK').find().toArray();
    const addedPoints = await db.collection('AddedPoints').find().toArray();
    const allPoints = [...pkPoints, ...addedPoints];
    res.json(allPoints);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur serveur');
  }
});

// Toutes les autres routes ici...
// [Le reste du contenu sera ajouté dans le prochain message pour éviter que ce soit trop long]

// Servir les fichiers statiques React en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✅ Serveur backend démarré sur http://localhost:${PORT}`);
});

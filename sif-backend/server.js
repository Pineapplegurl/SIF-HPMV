const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = 5000;

app.use(cors());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useUnifiedTopology: true });

app.get('/api/points', async (req, res) => {
    // Vérification de la présence du paramètre "name" dans la requête
    // Si le paramètre est manquant, renvoyer une erreur 400
  const nameQuery = req.query.name;

  if (!nameQuery) {
    return res.status(400).json({ error: 'Paramètre "name" manquant dans la requête' });
  }

  try {
    await client.connect();
    const db = client.db('SIF'); // Base de données
    const collection = db.collection('PK'); // Collection

    const results = await collection
      .find({ "Points remarquables ": { $regex: nameQuery, $options: 'i' } }) // RECHERCHE partielle insensible à la casse
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
      const results = await db.collection('PK').find({}).toArray(); // aucune condition
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
      const data = await db.collection('PK').find().toArray();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).send('Erreur serveur');
    }
  });  

app.listen(PORT, () => {
  console.log(`✅ Serveur backend démarré sur http://localhost:${PORT}`);
});
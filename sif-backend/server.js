const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = 5000;

app.use(cors());

app.use(express.json()); // Pour parser le JSON dans les requêtes POST

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

  app.post('/api/add-point', async (req, res) => {
  const {
    type, name, line, track, pk,
    xSif, ySif, xReal, yReal, infos,
    x, y // ✅ ajoute ceci
  } = req.body;

  if (!name || x === undefined || y === undefined) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (nom, x, y).' });
  }

  try {
    await client.connect();
    const db = client.db('SIF');
    const result = await db.collection('AddedPoints').insertOne({
      type, name, line, track, pk,
      xSif, ySif, xReal, yReal, infos,
      x, y, // ✅ enregistre-les dans MongoDB
      createdAt: new Date(),
    });

    res.status(201).json({ message: 'Point ajouté avec succès.', id: result.insertedId });
  } catch (err) {
    console.error('Erreur lors de l’insertion :', err);
    res.status(500).json({ error: 'Erreur serveur lors de l’ajout.' });
  }
});

app.get('/api/manual-points', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('SIF');
    const points = await db.collection('AddedPoints').find({}).toArray();
    res.json(points);
  } catch (err) {
    console.error('Erreur fetch points manuels :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/delete-point/:id', async (req, res) => {
  const pointId = req.params.id;

  try {
    await client.connect();
    const db = client.db('SIF');
    const result = await db.collection('AddedPoints').deleteOne({ _id: new ObjectId(pointId) });

    if (result.deletedCount === 1) {
      res.status(200).json({ message: 'Point supprimé avec succès.' });
    } else {
      res.status(404).json({ error: 'Point non trouvé.' });
    }
  } catch (err) {
    console.error('Erreur suppression point :', err);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur backend démarré sur http://localhost:${PORT}`);
});
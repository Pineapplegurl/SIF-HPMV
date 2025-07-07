const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;

const SECRET_KEY = process.env.JWT_SECRET || 'votre_cle_secrete';

app.use(cors());

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

const ADMIN_USER = {
  username: 'admin',
  passwordHash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'defaultpass', 10)};

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USER.username) {
    return res.status(401).json({ error: 'Nom d’utilisateur incorrect' });
  }

  const validPassword = await bcrypt.compare(password, ADMIN_USER.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '2h' });
  res.json({ token });
});

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

  app.post('/api/add-point', authenticateToken, async (req, res) => {
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


app.delete('/api/delete-point/:id', authenticateToken, async (req, res) => {
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

app.put('/api/update-point/:id', authenticateToken, async (req, res) => {
  const pointId = req.params.id;

  // On retire les champs qu'on ne veut pas modifier
  const { _id, createdAt, ...updateData } = req.body;

  try {
    await client.connect();
    const db = client.db('SIF');
    const collection = db.collection('AddedPoints');

    const result = await collection.updateOne(
      { _id: new ObjectId(pointId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Point non trouvé.' });
    }

    res.status(200).json({ message: 'Point mis à jour avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});


app.post('/api/add-zone',authenticateToken, async (req, res) => {
  const zone = req.body; 
  try {
    await client.connect();
    const db = client.db('SIF');
    const result = await db.collection('Zones').insertOne(zone);
    res.status(201).json({ message: 'Zone ajoutée avec succès.', id: result.insertedId });
  }
  catch (error) {
    console.error('Erreur ajout de la zone :', error);
    res.status(500).json({ error: 'Erreur serveur lors de l’ajout de la zone.' });
  }
});

app.get('/api/zones', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('SIF');
    const zones = await db.collection('Zones').find({}).toArray();
    res.json(zones);
  } catch (error) {
    console.error('Erreur fetch zones :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/interpolated-position', async (req, res) => {
  const { pk, track, line } = req.body;

  if (pk === undefined || !track || !line) {
    return res.status(400).json({ error: 'Champs pk, track et line requis.' });
  }

  try {
    await client.connect();
    const db = client.db('SIF');
    const collection = db.collection('PK');

    const points = await collection
      .find({ track: track, line: line, pk: { $exists: true } })
      .sort({ pk: 1 })
      .toArray();

    if (points.length < 2) {
      return res.status(404).json({ error: 'Pas assez de données pour interpoler.' });
    }

    let before, after;
    for (let i = 0; i < points.length - 1; i++) {
      if (points[i].pk <= pk && points[i + 1].pk >= pk) {
        before = points[i];
        after = points[i + 1];
        break;
      }
    }

    if (!before || !after) {
      return res.status(404).json({ error: 'Impossible d’interpoler ce PK.' });
    }

    const ratio = (pk - before.pk) / (after.pk - before.pk);
    const x = before.x + ratio * (after.x - before.x);
    const y = before.y + ratio * (after.y - before.y);

    res.json({ x, y });
  } catch (err) {
    console.error('Erreur interpolation :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur backend démarré sur http://localhost:${PORT}`);
});
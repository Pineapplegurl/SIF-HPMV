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

// Remplacer la génération dynamique du hash par l'utilisation d'un hash stocké dans .env
const ADMIN_USER = {
  username: 'admin',
  passwordHash: process.env.ADMIN_HASH // Stocke ici le hash généré une seule fois
};

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USER.username) {
    return res.status(401).json({ error: 'Nom d’utilisateur incorrect' });
  }

  // Comparaison sécurisée avec le hash stocké
  const validPassword = await bcrypt.compare(password, ADMIN_USER.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '2h' });
  res.json({ token });
});

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

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
      // On fusionne les points PK et AddedPoints pour l'interpolation frontend
      const pkPoints = await db.collection('PK').find().toArray();
      const addedPoints = await db.collection('AddedPoints').find().toArray();
      const allPoints = [...pkPoints, ...addedPoints];
      res.json(allPoints);
    } catch (error) {
      console.error(error);
      res.status(500).send('Erreur serveur');
    }
  });  

  app.post('/api/add-point', authenticateToken, async (req, res) => {
  const {
    type, name, line, track, pk,
    xSif, ySif, xReal, yReal, infos,
    x, y // Ajouté pour compatibilité
  } = req.body;

  // Si X et Y sont fournis, on les utilise, sinon on interpole
  let finalX = x;
  let finalY = y;

  if ((x === undefined || y === undefined) && pk !== undefined && track && line) {
    await client.connect();
    const db = client.db('SIF');
    const points = await db.collection('PK')
      .find({ track: track, line: line, pk: { $exists: true }, x: { $exists: true }, y: { $exists: true } })
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
    finalX = before.x + ratio * (after.x - before.x);
    finalY = before.y + ratio * (after.y - before.y);
  }

  if (!name || finalX === undefined || finalY === undefined) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (nom, x, y).' });
  }

  try {
    await client.connect();
    const db = client.db('SIF');
    const result = await db.collection('AddedPoints').insertOne({
      type, name, line, track, pk,
      xSif, ySif, xReal, yReal, infos,
      x: finalX,
      y: finalY,
      createdAt: new Date(),
    });

    res.status(201).json({ message: 'Point ajouté avec succès.', id: result.insertedId });
  } catch (err) {
    console.error('Erreur lors de l’insertion :', err);
    res.status(500).json({ error: 'Erreur serveur lors de l’ajout.' });
  }
});

app.post('/api/add-type-point', authenticateToken, async (req, res) => {
  const {
    type, name, line, track, pk,
    xSif, ySif, xReal, yReal, infos,
    x, y, info
  } = req.body;

  console.log('📥 SERVEUR - Données reçues pour add-type-point');

  if (!name || x === undefined || y === undefined) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (nom, x, y).' });
  }

  try {
    await client.connect();
    const db = client.db('SIF');
    const toInsert = {
      type,
      name,
      line,
      track,
      pk,
      xSif,
      ySif,
      xReal,
      yReal,
      // support both info/infos variants
      info: info ?? infos ?? null,
      infos: infos ?? info ?? null,
      x,
      y,
      createdAt: new Date(),
    };

    const result = await db.collection('TypePoints').insertOne(toInsert);

    // Debug: fetch et log du document inséré pour vérifier les champs sauvegardés
    try {
      const insertedDoc = await db.collection('TypePoints').findOne({ _id: result.insertedId });
      console.log('✅ SERVEUR - Document stocké dans TypePoints (sans Etats):', insertedDoc);
    } catch (fetchErr) {
      console.error('Erreur lors de la vérification du document inséré:', fetchErr);
    }

    res.status(201).json({ message: 'TypePoint ajouté avec succès.', id: result.insertedId });
  } catch (err) {
    console.error('Erreur lors de l’ajout du typePoint :', err);
    res.status(500).json({ error: 'Erreur serveur lors de l’ajout du typePoint.' });
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

app.get('/api/type-points', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('SIF');
    const points = await db.collection('TypePoints').find({}).toArray();
    res.json(points);
  } catch (err) {
    console.error('Erreur récupération TypePoints :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
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
  let { pk, track, line } = req.body;

  if (pk === undefined || !track || !line) {
    console.log('[DEBUG] Champs manquants:', { pk, track, line });
    return res.status(400).json({ error: 'Champs pk, track et line requis.' });
  }

  // Normalize track and line for matching (trim and lowercase)
  const norm = v => String(v || '').toLowerCase().trim();
  track = norm(track);
  line = norm(line);

  try {
    await client.connect();
    const db = client.db('SIF');
    // Use $expr and $regexMatch for case-insensitive, trimmed match
    const pkPoints = await db.collection('PK').find({
      $expr: {
        $and: [
          { $eq: [ { $toLower: { $trim: { input: "$track" } } }, track ] },
          { $eq: [ { $toLower: { $trim: { input: "$line" } } }, line ] }
        ]
      },
      pk: { $exists: true }, x: { $exists: true }, y: { $exists: true }
    }).toArray();
    const addedPoints = await db.collection('AddedPoints').find({
      $expr: {
        $and: [
          { $eq: [ { $toLower: { $trim: { input: "$track" } } }, track ] },
          { $eq: [ { $toLower: { $trim: { input: "$line" } } }, line ] }
        ]
      },
      pk: { $exists: true }, x: { $exists: true }, y: { $exists: true }
    }).toArray();
    // Conversion PK en float (remplace la virgule par un point si besoin)
    const parsePk = v => typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    const points = [...pkPoints, ...addedPoints]
      .map(p => ({ ...p, pk: parsePk(p.pk) }))
      .filter(p => !isNaN(p.pk))
      .sort((a, b) => a.pk - b.pk);

    console.log(`[DEBUG] Points trouvés pour line=${line}, track=${track}:`, points.map(p => p.pk));

    if (points.length < 2) {
      console.log('[DEBUG] Pas assez de points pour interpoler');
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
      console.log(`[DEBUG] Impossible d’interpoler ce PK=${pk}. PKs disponibles:`, points.map(p => p.pk));
      return res.status(404).json({ error: 'Impossible d’interpoler ce PK.' });
    }

    const ratio = (pk - before.pk) / (after.pk - before.pk);
    const x = before.x + ratio * (after.x - before.x);
    const y = before.y + ratio * (after.y - before.y);

    console.log(`[DEBUG] Interpolation réussie: PK=${pk}, x=${x}, y=${y}`);
    res.json({ x, y });
  } catch (err) {
    console.error('Erreur interpolation :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Import CSV and overwrite Interpolations
app.post('/api/interpolations/import', authenticateToken, async (req, res) => {
  const { data } = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'Données invalides.' });
  }
  try {
    await client.connect();
    const db = client.db('SIF');
    await db.collection('Interpolations').deleteMany({});
    if (data.length > 0) {
      await db.collection('Interpolations').insertMany(data);
    }
    res.status(201).json({ message: 'Table Interpolations écrasée et importée !' });
  } catch (err) {
    console.error('Erreur import Interpolations :', err);
    res.status(500).json({ error: 'Erreur serveur lors de l’import.' });
  }
});

// Import CSV and overwrite TypePoints
app.post('/api/type-points/import', authenticateToken, async (req, res) => {
  const { data } = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'Données invalides.' });
  }
  try {
    await client.connect();
    const db = client.db('SIF');
    await db.collection('TypePoints').deleteMany({});
    if (data.length > 0) {
      await db.collection('TypePoints').insertMany(data);
    }
    res.status(201).json({ message: 'Table TypePoints écrasée et importée !' });
  } catch (err) {
    console.error('Erreur import TypePoints :', err);
    res.status(500).json({ error: 'Erreur serveur lors de l’import.' });
  }
});

// Import CSV and overwrite Zones
app.post('/api/zones/import', authenticateToken, async (req, res) => {
  const { data } = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'Données invalides.' });
  }
  try {
    await client.connect();
    const db = client.db('SIF');
    await db.collection('Zones').deleteMany({});
    if (data.length > 0) {
      await db.collection('Zones').insertMany(data);
    }
    res.status(201).json({ message: 'Table Zones écrasée et importée !' });
  } catch (err) {
    console.error('Erreur import Zones :', err);
    res.status(500).json({ error: 'Erreur serveur lors de l’import.' });
  }
});


app.listen(PORT, () => {
  console.log(`✅ Serveur backend démarré sur http://localhost:${PORT}`);
});
// Suppression d'un point BTS/GSMR dans TypePoints
app.delete('/api/delete-type-point/:id', authenticateToken, async (req, res) => {
  const pointId = req.params.id;

  try {
    await client.connect();
    const db = client.db('SIF');
    const result = await db.collection('TypePoints').deleteOne({ _id: new ObjectId(pointId) });

    if (result.deletedCount === 1) {
      res.status(200).json({ message: 'Point BTS/GSMR supprimé avec succès.' });
    } else {
      res.status(404).json({ error: 'Point BTS/GSMR non trouvé.' });
    }
  } catch (err) {
    console.error('Erreur suppression point BTS/GSMR :', err);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du point BTS/GSMR.' });
  }
});
app.post('/api/save-type-points', authenticateToken, async (req, res) => {
  const { points } = req.body;
  if (!Array.isArray(points) || points.length === 0) {
    return res.status(400).json({ error: 'Aucun point à sauvegarder.' });
  }
  try {
    await client.connect();
    const db = client.db('SIF');
    // On supprime les anciens points pour éviter les doublons
    await db.collection('SavedTypePoints').deleteMany({});
    // On insère les nouveaux
    await db.collection('SavedTypePoints').insertMany(points);
    res.status(201).json({ message: 'Points BTS/GSMR sauvegardés !' });
  } catch (err) {
    console.error('Erreur sauvegarde BTS/GSMR :', err);
    res.status(500).json({ error: 'Erreur serveur lors de la sauvegarde.' });
  }
});
app.get('/api/saved-type-points', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('SIF');
    const points = await db.collection('SavedTypePoints').find({}).toArray();
    res.json(points);
  } catch (err) {
    console.error('Erreur récupération SavedTypePoints :', err);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération.' });
  }
});
app.delete('/api/delete-saved-type-point/:id', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('SIF');
    const { id } = req.params;
    const result = await db.collection('SavedTypePoints').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Point non trouvé.' });
    }
  } catch (err) {
    console.error('Erreur suppression SavedTypePoint :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});
// Suppression d'une zone dans Zones
app.delete('/api/delete-zone/:id', authenticateToken, async (req, res) => {
  const zoneId = req.params.id;
  try {
    await client.connect();
    const db = client.db('SIF');
    const result = await db.collection('Zones').deleteOne({ _id: new ObjectId(zoneId) });
    if (result.deletedCount === 1) {
      res.status(200).json({ message: 'Zone supprimée avec succès.' });
    } else {
      res.status(404).json({ error: 'Zone non trouvée.' });
    }
  } catch (err) {
    console.error('Erreur suppression zone :', err);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
  }
});

// Mettre à jour un point BTS/GSMR
app.put('/api/type-points/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updatedPoint = req.body;
  
  try {
    await client.connect();
    const db = client.db('SIF');
    const { ObjectId } = require('mongodb');
    
    const result = await db.collection('TypePoints').updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedPoint }
    );
    
    if (result.matchedCount === 0) {
      res.status(404).json({ message: 'Point BTS/GSMR non trouvé.' });
    } else {
      res.status(200).json({ message: 'Point BTS/GSMR mis à jour avec succès.' });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du point BTS/GSMR:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  } finally {
    await client.close();
  }
});

// Mettre à jour un point d'interpolation
app.put('/api/manual-points/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updatedPoint = req.body;
  
  try {
    await client.connect();
    const db = client.db('SIF');
    const { ObjectId } = require('mongodb');
    
    const result = await db.collection('AddedPoints').updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedPoint }
    );
    
    if (result.matchedCount === 0) {
      res.status(404).json({ message: 'Point d\'interpolation non trouvé.' });
    } else {
      res.status(200).json({ message: 'Point d\'interpolation mis à jour avec succès.' });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du point d\'interpolation:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  } finally {
    await client.close();
  }
});

// Mettre à jour une zone
app.put('/api/zones/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updatedZone = req.body;
  
  try {
    await client.connect();
    const db = client.db('SIF');
    const { ObjectId } = require('mongodb');
    
    const result = await db.collection('Zones').updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedZone }
    );
    
    if (result.matchedCount === 0) {
      res.status(404).json({ message: 'Zone non trouvée.' });
    } else {
      res.status(200).json({ message: 'Zone mise à jour avec succès.' });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la zone:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  } finally {
    await client.close();
  }
});
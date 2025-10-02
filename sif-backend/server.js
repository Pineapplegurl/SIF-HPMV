const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

const SECRET_KEY = process.env.JWT_SECRET || 'votre_cle_secrete';

// Variables MongoDB globales
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

// Fonction de connexion MongoDB unique
async function connectToMongoDB() {
  try {
    await client.connect();
    db = client.db('SIF');
    console.log('✅ Connexion MongoDB établie');
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB:', error);
    process.exit(1);
  }
}

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

// Configuration pour servir les fichiers statiques (images uploadées)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Configuration Multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `layer-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non autorisé. Utilisez PNG, JPG ou WebP.'));
    }
  }
});

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

app.get('/api/points', async (req, res) => {
    // Vérification de la présence du paramètre "name" dans la requête
    // Si le paramètre est manquant, renvoyer une erreur 400
  const nameQuery = req.query.name;

  if (!nameQuery) {
    return res.status(400).json({ error: 'Paramètre "name" manquant dans la requête' });
  }

  try {
    const results = await db.collection('PK')
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
      const results = await db.collection('PK').find({}).toArray();
      res.json(results);
    } catch (error) {
      console.error('Erreur lors de la récupération de tous les points :', error);
      res.status(500).send('Erreur serveur');
    }
  });

  app.get('/api/pkdata', async (req, res) => {
    try {
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
  console.log('📍 GET /api/manual-points appelé');
  try {
    const points = await db.collection('AddedPoints').find({}).toArray();
    
    // Nettoie les données
    const cleanedPoints = points
      .filter(p => p.x && p.y && p.pk)
      .map(point => ({
        ...point,
        pk: typeof point.pk === 'string' ? 
            parseFloat(point.pk.replace(',', '.')) : 
            point.pk,
        x: point.x || point.xSif || 0,
        y: point.y || point.ySif || 0
      }));
    
    console.log('📍 Points manuels récupérés:', cleanedPoints.length);
    res.json(cleanedPoints);
  } catch (err) {
    console.error('Erreur fetch points manuels :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/type-points', async (req, res) => {
  console.log('📡 GET /api/type-points appelé');
  try {
    const points = await db.collection('TypePoints').find({}).toArray();
    
    // Nettoie les données
    const cleanedPoints = points
      .filter(p => p.x && p.y && p.pk)
      .map(point => ({
        ...point,
        pk: typeof point.pk === 'string' ? 
            parseFloat(point.pk.replace(',', '.')) : 
            point.pk,
        x: point.x || point.xSif || 0,
        y: point.y || point.ySif || 0
      }));
    
    console.log('📡 Type points récupérés:', cleanedPoints.length);
    res.json(cleanedPoints);
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
  console.log('🗺️ GET /api/zones appelé');
  try {
    const zones = await db.collection('Zones').find({}).toArray();
    console.log('🗺️ Zones récupérées:', zones.length);
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

// === ROUTES ADDITIONNELLES (déplacées avant app.listen) ===

// Suppression d'un point BTS/GSMR dans TypePoints
app.delete('/api/delete-type-point/:id', authenticateToken, async (req, res) => {
  const pointId = req.params.id;

  try {
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
    await db.collection('SavedTypePoints').deleteMany({});
    await db.collection('SavedTypePoints').insertMany(points);
    res.status(201).json({ message: 'Points BTS/GSMR sauvegardés !' });
  } catch (err) {
    console.error('Erreur sauvegarde BTS/GSMR :', err);
    res.status(500).json({ error: 'Erreur serveur lors de la sauvegarde.' });
  }
});

app.get('/api/saved-type-points', async (req, res) => {
  try {
    const points = await db.collection('SavedTypePoints').find({}).toArray();
    res.json(points);
  } catch (err) {
    console.error('Erreur récupération SavedTypePoints :', err);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération.' });
  }
});

app.delete('/api/delete-saved-type-point/:id', async (req, res) => {
  try {
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

app.delete('/api/delete-zone/:id', authenticateToken, async (req, res) => {
  const zoneId = req.params.id;
  try {
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

app.put('/api/type-points/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updatedPoint = req.body;
  
  try {
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
  }
});

app.put('/api/manual-points/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updatedPoint = req.body;
  
  try {
    // Supprimer _id du body s'il existe pour éviter l'erreur immutable
    const { _id, ...pointWithoutId } = updatedPoint;
    
    const result = await db.collection('AddedPoints').updateOne(
      { _id: new ObjectId(id) },
      { $set: pointWithoutId }
    );
    
    if (result.matchedCount === 0) {
      res.status(404).json({ message: 'Point d\'interpolation non trouvé.' });
    } else {
      res.status(200).json({ message: 'Point d\'interpolation mis à jour avec succès.' });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du point d\'interpolation:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.put('/api/zones/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updatedZone = req.body;
  
  try {
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
  }
});

// === FIN DES ROUTES ===

// Servir les fichiers statiques React en production
if (process.env.NODE_ENV === 'production') {
  // Servir les fichiers statiques du build React
  app.use(express.static(path.join(__dirname, '../build')));
  
  // Routes spécifiques pour React Router (éviter le wildcard * qui cause path-to-regexp error)
  const reactRoutes = ['/', '/login', '/admin', '/map', '/guest'];
  reactRoutes.forEach(route => {
    app.get(route, (req, res) => {
      res.sendFile(path.join(__dirname, '../build/index.html'));
    });
  });
  
  // Gestion des routes API non trouvées
  app.get('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });
}

// ============================================
// GESTION DES CALQUES SIF
// ============================================

// Récupérer tous les calques
app.get('/api/layers', authenticateToken, async (req, res) => {
  try {
    const layers = await db.collection('Layers')
      .find({})
      .sort({ zIndex: 1, name: 1 })
      .toArray();
    res.json(layers);
  } catch (error) {
    console.error('Erreur récupération calques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouveau calque
app.post('/api/layers', authenticateToken, async (req, res) => {
  try {
    const { name, description, opacity, visible, zIndex } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Le nom du calque est requis' });
    }

    const newLayer = {
      name,
      description: description || '',
      opacity: opacity !== undefined ? parseFloat(opacity) : 1,
      visible: visible !== undefined ? visible : true,
      zIndex: parseInt(zIndex) || 0,
      imageUrl: null,
      dimensions: null,
      fileSize: null,
      createdAt: new Date(),
      lastModified: new Date(),
      versions: []
    };

    const result = await db.collection('Layers').insertOne(newLayer);
    const layer = await db.collection('Layers').findOne({ _id: result.insertedId });
    
    res.json(layer);
  } catch (error) {
    console.error('Erreur création calque:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un calque
app.put('/api/layers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id; // Ne pas modifier l'ID
    
    updateData.lastModified = new Date();
    if (updateData.opacity !== undefined) {
      updateData.opacity = parseFloat(updateData.opacity);
    }
    if (updateData.zIndex !== undefined) {
      updateData.zIndex = parseInt(updateData.zIndex);
    }

    const result = await db.collection('Layers').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Calque non trouvé' });
    }

    const layer = await db.collection('Layers').findOne({ _id: new ObjectId(id) });
    res.json(layer);
  } catch (error) {
    console.error('Erreur mise à jour calque:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un calque
app.delete('/api/layers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer le calque pour supprimer ses fichiers
    const layer = await db.collection('Layers').findOne({ _id: new ObjectId(id) });
    if (!layer) {
      return res.status(404).json({ error: 'Calque non trouvé' });
    }

    // Supprimer le fichier image principal
    if (layer.imageUrl) {
      const filePath = path.join(uploadsDir, path.basename(layer.imageUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Supprimer les versions précédentes
    if (layer.versions && layer.versions.length > 0) {
      layer.versions.forEach(version => {
        if (version.imageUrl) {
          const filePath = path.join(uploadsDir, path.basename(version.imageUrl));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      });
    }

    // Supprimer de la base de données
    await db.collection('Layers').deleteOne({ _id: new ObjectId(id) });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression calque:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Upload d'image pour un calque
app.post('/api/layers/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }

    const { layerId } = req.body;
    const filePath = req.file.path;
    const imageUrl = `/uploads/${req.file.filename}`;

    // Obtenir les dimensions de l'image avec Sharp
    const metadata = await sharp(filePath).metadata();
    const dimensions = {
      width: metadata.width,
      height: metadata.height
    };

    if (layerId) {
      // Mise à jour d'un calque existant
      const layer = await db.collection('Layers').findOne({ _id: new ObjectId(layerId) });
      if (!layer) {
        // Supprimer le fichier uploadé si le calque n'existe pas
        fs.unlinkSync(filePath);
        return res.status(404).json({ error: 'Calque non trouvé' });
      }

      // Sauvegarder l'ancienne version si elle existe
      if (layer.imageUrl) {
        const versionData = {
          imageUrl: layer.imageUrl,
          dimensions: layer.dimensions,
          fileSize: layer.fileSize,
          uploadedAt: layer.lastModified || layer.createdAt,
          version: (layer.versions?.length || 0) + 1
        };

        await db.collection('Layers').updateOne(
          { _id: new ObjectId(layerId) },
          { 
            $push: { versions: versionData },
            $set: {
              imageUrl,
              dimensions,
              fileSize: req.file.size,
              lastModified: new Date()
            }
          }
        );
      } else {
        // Première image pour ce calque
        await db.collection('Layers').updateOne(
          { _id: new ObjectId(layerId) },
          { 
            $set: {
              imageUrl,
              dimensions,
              fileSize: req.file.size,
              lastModified: new Date()
            }
          }
        );
      }

      const updatedLayer = await db.collection('Layers').findOne({ _id: new ObjectId(layerId) });
      res.json(updatedLayer);
    } else {
      // Nouveau calque avec image
      const newLayer = {
        name: `Calque ${Date.now()}`,
        description: '',
        imageUrl,
        dimensions,
        fileSize: req.file.size,
        opacity: 1,
        visible: true,
        zIndex: 0,
        createdAt: new Date(),
        lastModified: new Date(),
        versions: []
      };

      const result = await db.collection('Layers').insertOne(newLayer);
      const layer = await db.collection('Layers').findOne({ _id: result.insertedId });
      
      res.json(layer);
    }
  } catch (error) {
    console.error('Erreur upload image:', error);
    
    // Supprimer le fichier en cas d'erreur
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

// Récupérer les calques publics (pour l'affichage non-admin)
app.get('/api/layers/public', async (req, res) => {
  try {
    const layers = await db.collection('Layers')
      .find({ visible: true })
      .sort({ zIndex: 1, name: 1 })
      .project({ 
        name: 1, 
        imageUrl: 1, 
        opacity: 1, 
        zIndex: 1, 
        visible: 1,
        description: 1 
      })
      .toArray();
    res.json(layers);
  } catch (error) {
    console.error('Erreur récupération calques publics:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Initialiser les calques par défaut automatiquement (sans authentification)
app.post('/api/layers/auto-init', async (req, res) => {
  try {
    // Vérifier si des calques existent déjà
    const existingCount = await db.collection('Layers').countDocuments();
    
    if (existingCount > 0) {
      return res.json({ success: true, message: 'Calques déjà initialisés', count: existingCount });
    }

    const defaultLayers = [
      { name: "Situation actuelle", imageUrl: "/SIF-V6-SIF-EA.png", zIndex: 0 },
      { name: "Phase 1", imageUrl: "/SIF-V6-PHASE1.png", zIndex: 1 },
      { name: "Phase 1 pose", imageUrl: "/SIF-V3-Phase1 Pose.png", zIndex: 2 },
      { name: "Phase 1 dépose", imageUrl: "/SIF-V3-Phase1Dépose.png", zIndex: 3 },
      { name: "Phase 2", imageUrl: "/SIF-V3-Phase2.png", zIndex: 4 },
      { name: "Phase 2 pose", imageUrl: "/SIF-V3-Phase2Pose.png", zIndex: 5 },
      { name: "Phase 2 dépose", imageUrl: "/SIF-V3-Phase2Depose.png", zIndex: 6 },
      { name: "Réflexion/option", imageUrl: "/SIF-V3-RéflexionLNPCA.png", zIndex: 7 },
      { name: "HPMV", imageUrl: "/SIF-V3-HPMVpng.png", zIndex: 8 },
      { name: "HPMV pose", imageUrl: "/SIF-V3-HPMVPosel.png", zIndex: 9 },
      { name: "HPMV dépose", imageUrl: "/SIF-V3-HPMVDépose.png", zIndex: 10 },
      { name: "Autres projets", imageUrl: "/SIF-V3-Autres-projets.png", zIndex: 11 },
      { name: "Autres projets pose", imageUrl: "/SIF-V3-Autres-projets-Pose.png", zIndex: 12 },
      { name: "Autres projets dépose", imageUrl: "/SIF-V3-Autres-projets-Déposel.png", zIndex: 13 }
    ];

    const layersToInsert = defaultLayers.map(layer => ({
      ...layer,
      description: `Calque ${layer.name}`,
      opacity: layer.name === "Situation actuelle" ? 1 : 0.6,
      visible: true,
      dimensions: null,
      fileSize: null,
      createdAt: new Date(),
      lastModified: new Date(),
      versions: []
    }));

    await db.collection('Layers').insertMany(layersToInsert);
    console.log(`✅ ${layersToInsert.length} calques par défaut créés automatiquement`);

    res.json({ success: true, message: 'Calques par défaut initialisés automatiquement', count: layersToInsert.length });
  } catch (error) {
    console.error('Erreur auto-initialisation calques:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'auto-initialisation' });
  }
});

// Auto-initialiser les calques par défaut (sans auth, pour le premier chargement)
app.post('/api/layers/auto-init', async (req, res) => {
  try {
    // Vérifier si des calques existent déjà
    const existingCount = await db.collection('Layers').countDocuments();
    
    if (existingCount > 0) {
      return res.json({ success: true, message: 'Calques déjà existants' });
    }

    const defaultLayers = [
      { name: "Situation actuelle", imageUrl: "/SIF-V6-SIF-EA.png", zIndex: 0 },
      { name: "Phase 1", imageUrl: "/SIF-V6-PHASE1.png", zIndex: 1 },
      { name: "Phase 1 pose", imageUrl: "/SIF-V3-Phase1 Pose.png", zIndex: 2 },
      { name: "Phase 1 dépose", imageUrl: "/SIF-V3-Phase1Dépose.png", zIndex: 3 },
      { name: "Phase 2", imageUrl: "/SIF-V3-Phase2.png", zIndex: 4 },
      { name: "Phase 2 pose", imageUrl: "/SIF-V3-Phase2Pose.png", zIndex: 5 },
      { name: "Phase 2 dépose", imageUrl: "/SIF-V3-Phase2Depose.png", zIndex: 6 },
      { name: "Réflexion/option", imageUrl: "/SIF-V3-RéflexionLNPCA.png", zIndex: 7 },
      { name: "HPMV", imageUrl: "/SIF-V3-HPMVpng.png", zIndex: 8 },
      { name: "HPMV pose", imageUrl: "/SIF-V3-HPMVPosel.png", zIndex: 9 },
      { name: "HPMV dépose", imageUrl: "/SIF-V3-HPMVDépose.png", zIndex: 10 },
      { name: "Autres projets", imageUrl: "/SIF-V3-Autres-projets.png", zIndex: 11 },
      { name: "Autres projets pose", imageUrl: "/SIF-V3-Autres-projets-Pose.png", zIndex: 12 },
      { name: "Autres projets dépose", imageUrl: "/SIF-V3-Autres-projets-Déposel.png", zIndex: 13 }
    ];

    for (const layer of defaultLayers) {
      const newLayer = {
        ...layer,
        description: `Calque ${layer.name}`,
        opacity: layer.name === "Situation actuelle" ? 1 : 0.6,
        visible: true,
        dimensions: null,
        fileSize: null,
        createdAt: new Date(),
        lastModified: new Date(),
        versions: []
      };

      await db.collection('Layers').insertOne(newLayer);
    }

    console.log('✅ Auto-initialisation des calques par défaut terminée');
    res.json({ success: true, message: 'Calques par défaut auto-initialisés' });
  } catch (error) {
    console.error('Erreur auto-initialisation calques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Initialiser les calques par défaut (à exécuter une seule fois)
app.post('/api/layers/init-defaults', authenticateToken, async (req, res) => {
  try {
    const defaultLayers = [
      { name: "Situation actuelle", imageUrl: "/SIF-V6-SIF-EA.png", zIndex: 0 },
      { name: "Phase 1", imageUrl: "/SIF-V6-PHASE1.png", zIndex: 1 },
      { name: "Phase 1 pose", imageUrl: "/SIF-V3-Phase1 Pose.png", zIndex: 2 },
      { name: "Phase 1 dépose", imageUrl: "/SIF-V3-Phase1Dépose.png", zIndex: 3 },
      { name: "Phase 2", imageUrl: "/SIF-V3-Phase2.png", zIndex: 4 },
      { name: "Phase 2 pose", imageUrl: "/SIF-V3-Phase2Pose.png", zIndex: 5 },
      { name: "Phase 2 dépose", imageUrl: "/SIF-V3-Phase2Depose.png", zIndex: 6 },
      { name: "Réflexion/option", imageUrl: "/SIF-V3-RéflexionLNPCA.png", zIndex: 7 },
      { name: "HPMV", imageUrl: "/SIF-V3-HPMVpng.png", zIndex: 8 },
      { name: "HPMV pose", imageUrl: "/SIF-V3-HPMVPosel.png", zIndex: 9 },
      { name: "HPMV dépose", imageUrl: "/SIF-V3-HPMVDépose.png", zIndex: 10 },
      { name: "Autres projets", imageUrl: "/SIF-V3-Autres-projets.png", zIndex: 11 },
      { name: "Autres projets pose", imageUrl: "/SIF-V3-Autres-projets-Pose.png", zIndex: 12 },
      { name: "Autres projets dépose", imageUrl: "/SIF-V3-Autres-projets-Déposel.png", zIndex: 13 }
    ];

    for (const layer of defaultLayers) {
      // Vérifier si le calque existe déjà
      const existing = await db.collection('Layers').findOne({ name: layer.name });
      
      if (!existing) {
        const newLayer = {
          ...layer,
          description: `Calque ${layer.name}`,
          opacity: layer.name === "Situation actuelle" ? 1 : 0.6,
          visible: true,
          dimensions: null,
          fileSize: null,
          createdAt: new Date(),
          lastModified: new Date(),
          versions: []
        };

        await db.collection('Layers').insertOne(newLayer);
        console.log(`Calque créé: ${layer.name}`);
      } else {
        console.log(`Calque existe déjà: ${layer.name}`);
      }
    }

    res.json({ success: true, message: 'Calques par défaut initialisés' });
  } catch (error) {
    console.error('Erreur initialisation calques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route de healthcheck pour Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Fonction de démarrage du serveur
async function startServer() {
  await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log(`✅ Serveur backend démarré sur http://localhost:${PORT}`);
  });
}

// Démarrage
startServer().catch(console.error);
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Configuration similaire au serveur principal
const app = express();

const SECRET_KEY = process.env.JWT_SECRET || 'votre_cle_secrete';

// Variables MongoDB globales
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

// Fonction de connexion MongoDB
async function connectToMongoDB() {
  if (!db) {
    try {
      await client.connect();
      db = client.db('SIF');
      console.log('✅ Connexion MongoDB établie (Netlify Function)');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error);
      throw error;
    }
  }
  return db;
}

// Configuration CORS pour Netlify
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token d\'accès requis' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Route de healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: 'netlify-functions'
  });
});

// Route de connexion
app.post('/login', async (req, res) => {
  try {
    console.log('🔐 Tentative de connexion:', req.body);
    await connectToMongoDB();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username et password requis' });
    }

    // Connexion admin
    if (username === 'admin') {
      const adminHash = process.env.ADMIN_HASH || '$2b$12$eroS5zUaS2C8C8uq3Cg7X.N7A4Kw/fk4MqxnNiKstZn0TFy2efbKG';
      console.log('🔐 Vérification admin avec hash:', adminHash.substring(0, 20) + '...');
      
      const isValidPassword = await bcrypt.compare(password, adminHash);
      console.log('🔐 Résultat comparaison admin:', isValidPassword);
      
      if (isValidPassword) {
        const token = jwt.sign({ username: 'admin', role: 'admin' }, SECRET_KEY, { expiresIn: '24h' });
        console.log('✅ Connexion admin réussie');
        return res.json({ token, role: 'admin', message: 'Connexion réussie' });
      } else {
        console.log('❌ Mot de passe admin incorrect');
        return res.status(401).json({ message: 'Mot de passe incorrect' });
      }
    }

    // Connexion utilisateur normal
    const users = db.collection('users');
    const user = await users.findOne({ username });
    console.log('🔐 Utilisateur trouvé:', user ? 'Oui' : 'Non');

    if (user) {
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log('🔐 Résultat comparaison utilisateur:', isValidPassword);
      
      if (isValidPassword) {
        const token = jwt.sign({ username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
        console.log('✅ Connexion utilisateur réussie');
        return res.json({ token, role: user.role, message: 'Connexion réussie' });
      }
    }

    console.log('❌ Identifiants invalides');
    res.status(401).json({ message: 'Identifiants invalides' });
  } catch (error) {
    console.error('❌ Erreur de connexion:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route pour récupérer les points manuels
app.get('/points', async (req, res) => {
  try {
    await connectToMongoDB();
    const collection = db.collection('manualPoints');
    const points = await collection.find({}).toArray();
    res.json(points);
  } catch (error) {
    console.error('Erreur récupération points:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route pour ajouter un point manuel
app.post('/points', authenticateToken, async (req, res) => {
  try {
    await connectToMongoDB();
    const { pk, x, y, note } = req.body;
    
    if (pk === undefined || x === undefined || y === undefined) {
      return res.status(400).json({ message: 'PK, x et y sont requis' });
    }

    const newPoint = {
      pk: parseFloat(pk),
      x: parseFloat(x),
      y: parseFloat(y),
      note: note || '',
      createdAt: new Date(),
      createdBy: req.user.username
    };

    const collection = db.collection('manualPoints');
    const result = await collection.insertOne(newPoint);
    
    const insertedPoint = await collection.findOne({ _id: result.insertedId });
    res.status(201).json(insertedPoint);
  } catch (error) {
    console.error('Erreur ajout point:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route pour supprimer un point
app.delete('/points/:id', authenticateToken, async (req, res) => {
  try {
    await connectToMongoDB();
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    const collection = db.collection('manualPoints');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Point non trouvé' });
    }
    
    res.json({ message: 'Point supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression point:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route pour récupérer les points de type
app.get('/type-points', async (req, res) => {
  try {
    await connectToMongoDB();
    const collection = db.collection('typePoints');
    const points = await collection.find({}).toArray();
    res.json(points);
  } catch (error) {
    console.error('Erreur récupération type points:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Export pour Netlify Functions
const handler = serverless(app);

module.exports.handler = async (event, context) => {
  // Gestion des requêtes OPTIONS pour CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: ''
    };
  }

  const result = await handler(event, context);
  return result;
};
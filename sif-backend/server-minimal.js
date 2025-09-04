const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration CORS
app.use(cors());
app.use(express.json());

// Route de test simple
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Servir les fichiers statiques React en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  // Route fallback pour React Router
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API route not found' });
    } else {
      res.sendFile(path.join(__dirname, '../build/index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`✅ Serveur backend démarré sur port ${PORT}`);
});

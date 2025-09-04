const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🔍 Démarrage du serveur de test...');

app.use(express.json());

// Routes de base une par une pour identifier le problème
console.log('✅ Ajout de la route /api/health');
app.get('/api/health', (req, res) => {
  console.log('📍 Route /api/health appelée');
  res.json({ status: 'OK', message: 'Server is running' });
});

console.log('✅ Configuration des fichiers statiques');
// Servir les fichiers statiques React en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  console.log('✅ Ajout de la route fallback');
  // Route fallback pour React Router
  app.get('*', (req, res) => {
    console.log(`📍 Route fallback appelée pour: ${req.path}`);
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API route not found' });
    } else {
      res.sendFile(path.join(__dirname, '../build/index.html'));
    }
  });
}

console.log('🚀 Démarrage du serveur...');
app.listen(PORT, () => {
  console.log(`✅ Serveur de test démarré sur port ${PORT}`);
});

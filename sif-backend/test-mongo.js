require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testMongoDB() {
  console.log('🔍 Test de connexion MongoDB...');
  console.log('📡 URI:', process.env.MONGODB_URI);
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connexion MongoDB réussie !');
    
    const db = client.db();
    console.log('📊 Base de données:', db.databaseName);
    
    // Test des collections avec les vrais noms
    const collections = await db.listCollections().toArray();
    console.log('📁 Collections trouvées:', collections.map(c => c.name));
    
    // Test AddedPoints (probablement les points manuels)
    const addedPoints = await db.collection('AddedPoints').find({}).limit(3).toArray();
    console.log('➕ AddedPoints trouvés:', addedPoints.length);
    if (addedPoints.length > 0) {
      console.log('➕ Premier AddedPoint:', addedPoints[0]);
    }
    
    // Test TypePoints
    const typePoints = await db.collection('TypePoints').find({}).limit(3).toArray();
    console.log('📡 TypePoints trouvés:', typePoints.length);
    if (typePoints.length > 0) {
      console.log('📡 Premier TypePoint:', typePoints[0]);
    }
    
    // Test SavedTypePoints
    const savedTypePoints = await db.collection('SavedTypePoints').find({}).limit(3).toArray();
    console.log('💾 SavedTypePoints trouvés:', savedTypePoints.length);
    
    // Test Zones
    const zones = await db.collection('Zones').find({}).limit(3).toArray();
    console.log('🗺️ Zones trouvées:', zones.length);
    if (zones.length > 0) {
      console.log('🗺️ Première Zone:', zones[0]);
    }
    
    // Test PK
    const pkPoints = await db.collection('PK').find({}).limit(3).toArray();
    console.log('📏 PK trouvés:', pkPoints.length);
    if (pkPoints.length > 0) {
      console.log('📏 Premier PK:', pkPoints[0]);
    }
    
    await client.close();
    console.log('✅ Test terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur MongoDB:', error.message);
  }
}

testMongoDB();
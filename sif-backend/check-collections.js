const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkCollections() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connexion MongoDB établie');
    
    const db = client.db('SIF');
    
    // Lister toutes les collections
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Collections disponibles:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // Vérifier AddedPoints
    console.log('\n🔍 Vérification AddedPoints:');
    const addedPointsCount = await db.collection('AddedPoints').countDocuments();
    console.log(`  Nombre de documents: ${addedPointsCount}`);
    
    if (addedPointsCount > 0) {
      const sampleAdded = await db.collection('AddedPoints').findOne();
      console.log('  Exemple de document:', JSON.stringify(sampleAdded, null, 2));
    }
    
    // Vérifier Points ajoutés
    console.log('\n🔍 Vérification "Points ajoutés":');
    const pointsAjoutesCount = await db.collection('Points ajoutés').countDocuments();
    console.log(`  Nombre de documents: ${pointsAjoutesCount}`);
    
    if (pointsAjoutesCount > 0) {
      const sampleAjoutes = await db.collection('Points ajoutés').findOne();
      console.log('  Exemple de document:', JSON.stringify(sampleAjoutes, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.close();
  }
}

checkCollections();
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testManualPoints() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('SIF');
    
    console.log('🔍 Test de récupération des points manuels:');
    
    const points = await db.collection('AddedPoints').find({}).toArray();
    console.log(`Nombre total de points: ${points.length}`);
    
    if (points.length > 0) {
      console.log('\n📋 Premiers points:');
      points.slice(0, 3).forEach((point, idx) => {
        console.log(`${idx + 1}. ${point.name} - PK: ${point.pk} - X: ${point.x} - Y: ${point.y}`);
      });
      
      console.log('\n🧹 Points après nettoyage (logique serveur):');
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
      
      console.log(`Nombre après filtrage: ${cleanedPoints.length}`);
      cleanedPoints.slice(0, 3).forEach((point, idx) => {
        console.log(`${idx + 1}. ${point.name} - PK: ${point.pk} - X: ${point.x} - Y: ${point.y}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.close();
  }
}

testManualPoints();
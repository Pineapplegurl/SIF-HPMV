const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('sif_database');
    const points = await db.collection('pk_points').find({ name: /nice/i }).toArray();
    console.log("Résultats :", points);
  } catch (err) {
    console.error("Erreur de connexion ou requête :", err);
  } finally {
    await client.close();
  }
}

main();
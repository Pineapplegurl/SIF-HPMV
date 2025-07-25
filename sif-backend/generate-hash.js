const bcrypt = require('bcrypt');

const password = 'laCONNEXION25'; // Remplace par le mot de passe admin que tu veux

bcrypt.hash(password, 10, (err, hash) => {
  if (err) throw err;
  console.log('Hash à copier dans .env :');
  console.log(hash);
});
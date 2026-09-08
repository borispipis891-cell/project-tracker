import bcrypt from 'bcrypt';

const password = process.argv[2] || 'Qwerty123456';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  console.log('Password hash:');
  console.log(hash);
});

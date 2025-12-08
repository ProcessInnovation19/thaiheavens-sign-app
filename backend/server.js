const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS opzionale - solo se installato
try {
  const cors = require('cors');
  app.use(cors());
} catch (e) {
  console.log('CORS non disponibile, continuo senza...');
}

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'ThaiHeavens Backend API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


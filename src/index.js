const { createApp, connectDB } = require('./app.js');
require('dotenv').config();

async function main() {
  await connectDB();
  
  const app = createApp();
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`)
  );
}

main();

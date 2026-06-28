import fs from 'node:fs';
import app, { distDir } from './app.js';

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`WARNO deck randomizer API listening on http://localhost:${PORT}`);
  if (fs.existsSync(distDir)) {
    console.log(`Serving built frontend from ${distDir}`);
  } else {
    console.log('Frontend dist not found — run the Vite dev server, or build the frontend.');
  }
});

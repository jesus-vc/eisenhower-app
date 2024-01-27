import app from "./app.js";

import { PORT } from "./config.js";

app.listen(PORT, () => {
  console.log(`Sever starting on port ${PORT}...`);
});

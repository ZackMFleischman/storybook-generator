import { createApp } from './app.js';
import { config, validateConfig } from './config/index.js';

validateConfig();

const app = createApp();

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Projects path: ${config.projectsPath}`);
});

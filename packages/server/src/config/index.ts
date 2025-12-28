import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try multiple .env locations (cwd, monorepo root from source)
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../../../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Storage
  projectsPath: process.env.PROJECTS_PATH ?? path.join(process.cwd(), 'projects'),

  // API Keys
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  googleAiApiKey: process.env.GOOGLE_AI_API_KEY ?? '',

  // Default Models
  defaultTextModel: process.env.DEFAULT_TEXT_MODEL ?? 'claude-opus-4-5-20251101',
  defaultImageModel: process.env.DEFAULT_IMAGE_MODEL ?? 'gemini-2.0-flash-exp',
};

export function validateConfig(): void {
  if (!config.anthropicApiKey) {
    console.warn('Warning: ANTHROPIC_API_KEY not set');
  }
  if (!config.googleAiApiKey) {
    console.warn('Warning: GOOGLE_AI_API_KEY not set');
  }
}

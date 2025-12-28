import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/index.js';

// Adapters
import { ClaudeAdapter } from './adapters/text-generation/index.js';
import { GeminiAdapter } from './adapters/image-generation/index.js';
import { FilesystemStorageAdapter } from './adapters/storage/index.js';

// Services
import {
  ProjectService,
  OutlineService,
  ManuscriptService,
  IllustrationService,
  ExportService,
} from './services/index.js';

// Routes
import {
  createProjectsRouter,
  createGenerationRouter,
  createExportRouter,
  createImagesRouter,
} from './routes/index.js';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Initialize adapters
  const storage = new FilesystemStorageAdapter(config.projectsPath);
  const textAdapter = new ClaudeAdapter(config.anthropicApiKey, config.defaultTextModel);
  const imageAdapter = new GeminiAdapter(config.googleAiApiKey, config.defaultImageModel);

  // Initialize services
  const projectService = new ProjectService(storage);
  const outlineService = new OutlineService(textAdapter, storage);
  const manuscriptService = new ManuscriptService(textAdapter, storage);
  const illustrationService = new IllustrationService(imageAdapter, storage);
  const exportService = new ExportService(storage);

  // Register routes
  app.use('/api/projects', createProjectsRouter(projectService));
  app.use('/api/generate', createGenerationRouter(
    outlineService,
    manuscriptService,
    illustrationService
  ));
  app.use('/api/export', createExportRouter(exportService, storage));
  app.use('/api/images', createImagesRouter(storage));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}

import { Router, Request, Response } from 'express';
import {
  GenerateOutlineRequest,
  GenerateManuscriptRequest,
  GeneratePageRequest,
  GenerateAllPagesRequest,
} from '@storybook-generator/shared';
import {
  OutlineService,
  ManuscriptService,
  IllustrationService,
} from '../services/index.js';

export function createGenerationRouter(
  outlineService: OutlineService,
  manuscriptService: ManuscriptService,
  illustrationService: IllustrationService
): Router {
  const router = Router();

  // Generate outline from topic
  router.post('/outline', async (req: Request, res: Response) => {
    try {
      const request: GenerateOutlineRequest = req.body;

      if (!request.projectId || !request.topic) {
        res.status(400).json({ error: 'projectId and topic are required' });
        return;
      }

      const outline = await outlineService.generateOutline(request);
      res.json(outline);
    } catch (error) {
      console.error('Error generating outline:', error);
      res.status(500).json({ error: 'Failed to generate outline', details: String(error) });
    }
  });

  // Generate manuscript from outline
  router.post('/manuscript', async (req: Request, res: Response) => {
    try {
      const request: GenerateManuscriptRequest = req.body;

      if (!request.projectId) {
        res.status(400).json({ error: 'projectId is required' });
        return;
      }

      const manuscript = await manuscriptService.generateManuscript(request);
      res.json(manuscript);
    } catch (error) {
      console.error('Error generating manuscript:', error);
      res.status(500).json({ error: 'Failed to generate manuscript', details: String(error) });
    }
  });

  // Generate a single page illustration
  router.post('/page/:pageNumber', async (req: Request, res: Response) => {
    try {
      const pageNumber = parseInt(req.params.pageNumber, 10);
      const request: GeneratePageRequest = {
        ...req.body,
        pageNumber,
      };

      if (!request.projectId) {
        res.status(400).json({ error: 'projectId is required' });
        return;
      }

      const pageImage = await illustrationService.generatePage(request);
      res.json(pageImage);
    } catch (error) {
      console.error('Error generating page:', error);
      res.status(500).json({ error: 'Failed to generate page', details: String(error) });
    }
  });

  // Generate all page illustrations
  router.post('/all-pages', async (req: Request, res: Response) => {
    try {
      const request: GenerateAllPagesRequest = req.body;

      if (!request.projectId) {
        res.status(400).json({ error: 'projectId is required' });
        return;
      }

      // For now, we don't stream progress - just return when done
      const pageImages = await illustrationService.generateAllPages(request, (current, total, message) => {
        console.log(`[${current}/${total}] ${message}`);
      });

      res.json(pageImages);
    } catch (error) {
      console.error('Error generating all pages:', error);
      res.status(500).json({ error: 'Failed to generate pages', details: String(error) });
    }
  });

  return router;
}

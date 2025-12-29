import { Router, Request, Response } from 'express';
import {
  GenerateOutlineRequest,
  GenerateManuscriptRequest,
  GeneratePageRequest,
  GenerateAllPagesRequest,
  RefineOutlineRequest,
  RefineManuscriptRequest,
  RefineIllustrationRequest,
  RefineAllIllustrationsRequest,
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

  // Refine outline with feedback
  router.post('/outline/refine', async (req: Request, res: Response) => {
    try {
      const request: RefineOutlineRequest = req.body;

      if (!request.projectId || !request.feedback) {
        res.status(400).json({ error: 'projectId and feedback are required' });
        return;
      }

      const outline = await outlineService.refineOutline(request);
      res.json(outline);
    } catch (error) {
      console.error('Error refining outline:', error);
      res.status(500).json({ error: 'Failed to refine outline', details: String(error) });
    }
  });

  // Refine manuscript with feedback
  router.post('/manuscript/refine', async (req: Request, res: Response) => {
    try {
      const request: RefineManuscriptRequest = req.body;

      if (!request.projectId || !request.feedback) {
        res.status(400).json({ error: 'projectId and feedback are required' });
        return;
      }

      const manuscript = await manuscriptService.refineManuscript(request);
      res.json(manuscript);
    } catch (error) {
      console.error('Error refining manuscript:', error);
      res.status(500).json({ error: 'Failed to refine manuscript', details: String(error) });
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

  // Generate all page illustrations (with SSE progress)
  router.post('/all-pages', async (req: Request, res: Response) => {
    try {
      const request: GenerateAllPagesRequest = req.body;

      if (!request.projectId) {
        res.status(400).json({ error: 'projectId is required' });
        return;
      }

      // Check if client wants SSE progress updates
      const wantsProgress = req.headers.accept === 'text/event-stream';

      if (wantsProgress) {
        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const pageImages = await illustrationService.generateAllPages(
          request,
          (current, total, message) => {
            res.write(`data: ${JSON.stringify({ type: 'progress', current, total, message })}\n\n`);
          },
          (image, imageType) => {
            res.write(`data: ${JSON.stringify({ type: 'imageComplete', image, imageType })}\n\n`);
          }
        );

        res.write(`data: ${JSON.stringify({ type: 'complete', data: pageImages })}\n\n`);
        res.end();
      } else {
        // Standard JSON response
        const pageImages = await illustrationService.generateAllPages(request, (current, total, message) => {
          console.log(`[${current}/${total}] ${message}`);
        });
        res.json(pageImages);
      }
    } catch (error) {
      console.error('Error generating all pages:', error);
      if (req.headers.accept === 'text/event-stream') {
        res.write(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: 'Failed to generate pages', details: String(error) });
      }
    }
  });

  // Refine a single illustration
  router.post('/illustration/refine', async (req: Request, res: Response) => {
    try {
      const request: RefineIllustrationRequest = req.body;

      if (!request.projectId || request.target === undefined || !request.feedback) {
        res.status(400).json({ error: 'projectId, target, and feedback are required' });
        return;
      }

      const pageImage = await illustrationService.refineIllustration(
        request.projectId,
        request.target,
        request.feedback
      );
      res.json(pageImage);
    } catch (error) {
      console.error('Error refining illustration:', error);
      res.status(500).json({ error: 'Failed to refine illustration', details: String(error) });
    }
  });

  // Refine multiple illustrations
  router.post('/illustrations/refine', async (req: Request, res: Response) => {
    try {
      const request: RefineAllIllustrationsRequest = req.body;

      if (!request.projectId || !request.feedback) {
        res.status(400).json({ error: 'projectId and feedback are required' });
        return;
      }

      const result = await illustrationService.refineAllIllustrations(
        request.projectId,
        request.feedback
      );
      res.json(result);
    } catch (error) {
      console.error('Error refining illustrations:', error);
      res.status(500).json({ error: 'Failed to refine illustrations', details: String(error) });
    }
  });

  return router;
}

import { Router, Request, Response } from 'express';
import { IStorageAdapter, ImageCategory } from '../adapters/storage/index.js';

export function createImagesRouter(storage: IStorageAdapter): Router {
  const router = Router();

  // Get an image
  router.get('/:projectId/:category/:imageId', async (req: Request, res: Response) => {
    try {
      const { projectId, category, imageId } = req.params;

      if (!['pages', 'composed', 'references'].includes(category)) {
        res.status(400).json({ error: 'Invalid image category' });
        return;
      }

      const imageBuffer = await storage.loadImage(
        projectId,
        category as ImageCategory,
        imageId
      );

      res.setHeader('Content-Type', 'image/png');
      res.send(imageBuffer);
    } catch (error) {
      console.error('Error loading image:', error);
      res.status(404).json({ error: 'Image not found' });
    }
  });

  return router;
}

import { Router, Request, Response } from 'express';
import { ExportPdfRequest } from '@storybook-generator/shared';
import { ExportService } from '../services/index.js';
import { IStorageAdapter } from '../adapters/storage/index.js';

export function createExportRouter(
  exportService: ExportService,
  storage: IStorageAdapter
): Router {
  const router = Router();

  // Export project to PDF
  router.post('/:projectId/pdf', async (req: Request, res: Response) => {
    try {
      const request: ExportPdfRequest = {
        projectId: req.params.projectId,
        ...req.body,
      };

      const result = await exportService.exportPdf(request);
      res.json(result);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      res.status(500).json({ error: 'Failed to export PDF', details: String(error) });
    }
  });

  // Download an export
  router.get('/:projectId/exports/:exportId', async (req: Request, res: Response) => {
    try {
      const { projectId, exportId } = req.params;
      const pdfBuffer = await storage.loadExport(projectId, exportId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="storybook.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error downloading export:', error);
      res.status(404).json({ error: 'Export not found' });
    }
  });

  return router;
}

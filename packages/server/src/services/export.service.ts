import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import { ExportPdfRequest, ExportResult } from '@storybook-generator/shared';
import { IStorageAdapter } from '../adapters/storage/index.js';

// Page sizes in points (72 points = 1 inch)
const PAGE_SIZES = {
  '8x8': { width: 576, height: 576 },
  '8.5x8.5': { width: 612, height: 612 },
  '8x10': { width: 576, height: 720 },
  'a4': { width: 595.28, height: 841.89 },
};

export class ExportService {
  constructor(private storage: IStorageAdapter) {}

  async exportPdf(request: ExportPdfRequest): Promise<ExportResult> {
    const { projectId, pageSize, quality, includeCover, includeBackCover } = request;

    const project = await this.storage.loadProject(projectId);

    if (!project.pageImages.length) {
      throw new Error('Cannot export: no page images generated');
    }

    const pdfDoc = await PDFDocument.create();
    const size = PAGE_SIZES[pageSize ?? '8.5x8.5'];

    // Sort page images by page number
    const sortedImages = [...project.pageImages].sort((a, b) => a.pageNumber - b.pageNumber);

    // Add each page image to the PDF
    for (const pageImage of sortedImages) {
      const imageBuffer = await this.storage.loadImage(
        projectId,
        'pages',
        `page-${pageImage.pageNumber}`
      );

      // Embed the image
      let image;
      if (pageImage.imagePath.endsWith('.png') || pageImage.imagePath.includes('/pages/')) {
        image = await pdfDoc.embedPng(imageBuffer);
      } else {
        image = await pdfDoc.embedJpg(imageBuffer);
      }

      // Add a new page
      const page = pdfDoc.addPage([size.width, size.height]);

      // Calculate scaling to fit the page while maintaining aspect ratio
      const imageAspect = image.width / image.height;
      const pageAspect = size.width / size.height;

      let drawWidth: number;
      let drawHeight: number;

      if (imageAspect > pageAspect) {
        // Image is wider than page, fit to width
        drawWidth = size.width;
        drawHeight = size.width / imageAspect;
      } else {
        // Image is taller than page, fit to height
        drawHeight = size.height;
        drawWidth = size.height * imageAspect;
      }

      // Center the image on the page
      const x = (size.width - drawWidth) / 2;
      const y = (size.height - drawHeight) / 2;

      page.drawImage(image, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    }

    // Generate the PDF bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // Save the export
    const exportId = uuidv4();
    const filePath = await this.storage.saveExport(projectId, exportId, pdfBuffer);

    const result: ExportResult = {
      exportId,
      filePath,
      fileName: `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      createdAt: new Date().toISOString(),
    };

    return result;
  }
}

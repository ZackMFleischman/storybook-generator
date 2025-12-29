import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import { ExportPdfRequest, ExportResult } from '@storybook-generator/shared';
import { IStorageAdapter } from '../adapters/storage/index.js';

function isPng(buffer: Buffer): boolean {
  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  return buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47;
}

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
    const { projectId } = request;

    const project = await this.storage.loadProject(projectId);

    if (!project.pageImages.length) {
      throw new Error('Cannot export: no page images generated');
    }

    const pdfDoc = await PDFDocument.create();

    // Sort page images by page number
    const sortedImages = [...project.pageImages].sort((a, b) => a.pageNumber - b.pageNumber);

    // Add each page image to the PDF
    for (const pageImage of sortedImages) {
      const imageBuffer = await this.storage.loadImage(
        projectId,
        'pages',
        `page-${pageImage.pageNumber}`
      );

      // Embed the image (detect format from actual content, not file extension)
      const image = isPng(imageBuffer)
        ? await pdfDoc.embedPng(imageBuffer)
        : await pdfDoc.embedJpg(imageBuffer);

      // Add a page sized exactly to the image (no letterboxing)
      const page = pdfDoc.addPage([image.width, image.height]);

      // Draw image filling the entire page
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
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

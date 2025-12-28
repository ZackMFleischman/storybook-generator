import { PageImage, GeneratePageRequest, GenerateAllPagesRequest } from '@storybook-generator/shared';
import { IImageGenerationAdapter } from '../adapters/image-generation/index.js';
import { IStorageAdapter } from '../adapters/storage/index.js';
import { getIllustrationPrompt } from '../prompts/index.js';

export class IllustrationService {
  constructor(
    private imageAdapter: IImageGenerationAdapter,
    private storage: IStorageAdapter
  ) {}

  async generatePage(request: GeneratePageRequest): Promise<PageImage> {
    const { projectId, pageNumber, additionalPrompt } = request;

    const project = await this.storage.loadProject(projectId);

    if (!project.manuscript || !project.outline) {
      throw new Error('Cannot generate illustration: manuscript or outline not found');
    }

    const page = project.manuscript.pages.find(p => p.pageNumber === pageNumber);
    if (!page) {
      throw new Error(`Page ${pageNumber} not found in manuscript`);
    }

    const includeTextInImage = project.settings.textCompositionMode === 'ai-baked';

    let prompt = getIllustrationPrompt({
      page,
      characters: project.outline.characters,
      setting: project.outline.setting,
      targetAge: project.settings.targetAge,
      artStyleKeywords: project.settings.artStyleKeywords,
      fontStyle: project.settings.fontStyle,
      includeTextInImage,
    });

    if (additionalPrompt) {
      prompt += `\n\nAdditional instructions: ${additionalPrompt}`;
    }

    const generatedImage = await this.imageAdapter.generateImage(prompt, {
      aspectRatio: project.settings.aspectRatio,
    });

    // Save the image
    const imageId = `page-${pageNumber}`;
    const imagePath = await this.storage.saveImage(
      projectId,
      'pages',
      imageId,
      generatedImage.buffer
    );

    const pageImage: PageImage = {
      pageNumber,
      imagePath,
      hasTextBaked: includeTextInImage && !!page.text,
      bakedText: includeTextInImage ? (page.text ?? undefined) : undefined,
      prompt,
      generatedAt: new Date().toISOString(),
      modelUsed: this.imageAdapter.getModelInfo().id,
      aspectRatio: project.settings.aspectRatio,
    };

    // Update project with the new page image
    const existingIndex = project.pageImages.findIndex(p => p.pageNumber === pageNumber);
    if (existingIndex >= 0) {
      project.pageImages[existingIndex] = pageImage;
    } else {
      project.pageImages.push(pageImage);
      project.pageImages.sort((a, b) => a.pageNumber - b.pageNumber);
    }

    project.currentStage = 'illustrations';
    project.updatedAt = new Date().toISOString();
    await this.storage.saveProject(project);

    return pageImage;
  }

  async generateAllPages(
    request: GenerateAllPagesRequest,
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<PageImage[]> {
    const { projectId, generationMode, additionalPrompt } = request;

    const project = await this.storage.loadProject(projectId);

    if (!project.manuscript) {
      throw new Error('Cannot generate illustrations: manuscript not found');
    }

    const totalPages = project.manuscript.pages.length;
    const pageImages: PageImage[] = [];

    // For Phase 1, we use sequential generation
    // (parallel would be a future optimization)
    for (let i = 0; i < totalPages; i++) {
      const page = project.manuscript.pages[i];

      onProgress?.(i + 1, totalPages, `Generating page ${page.pageNumber}...`);

      const pageImage = await this.generatePage({
        projectId,
        pageNumber: page.pageNumber,
        additionalPrompt,
      });

      pageImages.push(pageImage);
    }

    return pageImages;
  }
}

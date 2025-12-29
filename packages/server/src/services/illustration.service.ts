import { PageImage, GeneratePageRequest, GenerateAllPagesRequest } from '@storybook-generator/shared';
import { IImageGenerationAdapter } from '../adapters/image-generation/index.js';
import { IStorageAdapter } from '../adapters/storage/index.js';
import { getIllustrationPrompt, getCoverPrompt, getBackCoverPrompt } from '../prompts/index.js';

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

  async generateCover(projectId: string): Promise<PageImage> {
    const project = await this.storage.loadProject(projectId);

    if (!project.outline) {
      throw new Error('Cannot generate cover: outline not found');
    }

    const prompt = getCoverPrompt({
      outline: project.outline,
      characters: project.outline.characters,
      setting: project.outline.setting,
      targetAge: project.settings.targetAge,
      artStyleKeywords: project.settings.artStyleKeywords,
      fontStyle: project.settings.fontStyle,
    });

    const generatedImage = await this.imageAdapter.generateImage(prompt, {
      aspectRatio: project.settings.aspectRatio,
    });

    // Save the cover image
    const imagePath = await this.storage.saveImage(
      projectId,
      'cover',
      'front',
      generatedImage.buffer
    );

    const coverImage: PageImage = {
      pageNumber: 0, // Cover is page 0
      imagePath,
      hasTextBaked: true,
      bakedText: project.outline.title,
      prompt,
      generatedAt: new Date().toISOString(),
      modelUsed: this.imageAdapter.getModelInfo().id,
      aspectRatio: project.settings.aspectRatio,
      imageType: 'cover',
    };

    // Update project with cover image
    project.coverImage = coverImage;
    project.updatedAt = new Date().toISOString();
    await this.storage.saveProject(project);

    return coverImage;
  }

  async generateBackCover(projectId: string): Promise<PageImage> {
    const project = await this.storage.loadProject(projectId);

    if (!project.outline) {
      throw new Error('Cannot generate back cover: outline not found');
    }

    const prompt = getBackCoverPrompt({
      outline: project.outline,
      characters: project.outline.characters,
      setting: project.outline.setting,
      targetAge: project.settings.targetAge,
      artStyleKeywords: project.settings.artStyleKeywords,
      fontStyle: project.settings.fontStyle,
    });

    const generatedImage = await this.imageAdapter.generateImage(prompt, {
      aspectRatio: project.settings.aspectRatio,
    });

    // Save the back cover image
    const imagePath = await this.storage.saveImage(
      projectId,
      'cover',
      'back',
      generatedImage.buffer
    );

    const backCoverImage: PageImage = {
      pageNumber: -1, // Back cover is page -1
      imagePath,
      hasTextBaked: true,
      bakedText: project.outline.backCoverBlurb,
      prompt,
      generatedAt: new Date().toISOString(),
      modelUsed: this.imageAdapter.getModelInfo().id,
      aspectRatio: project.settings.aspectRatio,
      imageType: 'back-cover',
    };

    // Update project with back cover image
    project.backCoverImage = backCoverImage;
    project.updatedAt = new Date().toISOString();
    await this.storage.saveProject(project);

    return backCoverImage;
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

    if (!project.outline) {
      throw new Error('Cannot generate illustrations: outline not found');
    }

    const contentPages = project.manuscript.pages.length;
    // Total = front cover + content pages + back cover
    const totalSteps = contentPages + 2;
    const pageImages: PageImage[] = [];
    let currentStep = 0;

    // Step 1: Generate front cover
    currentStep++;
    onProgress?.(currentStep, totalSteps, 'Generating front cover...');
    await this.generateCover(projectId);

    // Steps 2 to N+1: Generate content pages
    for (let i = 0; i < contentPages; i++) {
      const page = project.manuscript.pages[i];
      currentStep++;
      onProgress?.(currentStep, totalSteps, `Generating page ${page.pageNumber}...`);

      const pageImage = await this.generatePage({
        projectId,
        pageNumber: page.pageNumber,
        additionalPrompt,
      });

      pageImages.push(pageImage);
    }

    // Final step: Generate back cover
    currentStep++;
    onProgress?.(currentStep, totalSteps, 'Generating back cover...');
    await this.generateBackCover(projectId);

    return pageImages;
  }
}

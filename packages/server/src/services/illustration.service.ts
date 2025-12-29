import { PageImage, GeneratePageRequest, GenerateAllPagesRequest, ReferenceImage, ReferenceImageInfo, GenerationMetadata } from '@storybook-generator/shared';
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
    const { projectId, additionalPrompt } = request;

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

    // Create session for this generation run (Phase 2)
    const sessionId = await this.imageAdapter.createSession(projectId);

    try {
      // Step 1: Generate front cover FIRST (establishes style in session)
      currentStep++;
      onProgress?.(currentStep, totalSteps, 'Generating front cover...');
      const coverImage = await this.generateCoverWithSession(projectId, sessionId);

      // Update project with cover
      project.coverImage = coverImage;
      await this.storage.saveProject(project);

      // Steps 2 to N+1: Generate content pages SEQUENTIALLY
      // Pass up to 3 previous pages as reference images for visual consistency
      for (let i = 0; i < contentPages; i++) {
        const page = project.manuscript.pages[i];
        currentStep++;
        onProgress?.(currentStep, totalSteps, `Generating page ${page.pageNumber}...`);

        // Build reference images: cover + up to 2 previous pages (max 3 total)
        const referenceImages: ReferenceImage[] = [];

        // Always include cover as first reference (establishes style)
        if (coverImage) {
          try {
            const coverBuffer = await this.storage.loadImage(projectId, 'cover', 'front');
            referenceImages.push({
              type: 'style',
              label: 'Cover (style reference)',
              buffer: coverBuffer,
              mimeType: 'image/png',
            });
          } catch {
            // Cover not available
          }
        }

        // Add up to 2 previous pages
        const pagesToReference = pageImages.slice(-2);
        for (const prevPage of pagesToReference) {
          try {
            const prevBuffer = await this.storage.loadImage(
              projectId,
              'pages',
              `page-${prevPage.pageNumber}`
            );
            referenceImages.push({
              type: 'previous-page',
              label: `Page ${prevPage.pageNumber}`,
              buffer: prevBuffer,
              mimeType: 'image/png',
            });
          } catch {
            // Previous page not available, continue without it
          }
        }

        const pageImage = await this.generatePageWithSession(
          projectId,
          sessionId,
          page.pageNumber,
          referenceImages,
          additionalPrompt
        );

        pageImages.push(pageImage);

        // Update project with new page image
        const existingIndex = project.pageImages.findIndex(p => p.pageNumber === page.pageNumber);
        if (existingIndex >= 0) {
          project.pageImages[existingIndex] = pageImage;
        } else {
          project.pageImages.push(pageImage);
          project.pageImages.sort((a, b) => a.pageNumber - b.pageNumber);
        }
        project.currentStage = 'illustrations';
        project.updatedAt = new Date().toISOString();
        await this.storage.saveProject(project);
      }

      // Final step: Generate back cover
      currentStep++;
      onProgress?.(currentStep, totalSteps, 'Generating back cover...');
      const backCoverImage = await this.generateBackCoverWithSession(projectId, sessionId);

      // Update project with back cover
      project.backCoverImage = backCoverImage;
      project.updatedAt = new Date().toISOString();
      await this.storage.saveProject(project);

      return pageImages;
    } finally {
      // Clean up session
      this.imageAdapter.closeSession(sessionId);
    }
  }

  // Session-aware page generation (Phase 2)
  private async generatePageWithSession(
    projectId: string,
    sessionId: string,
    pageNumber: number,
    referenceImages: ReferenceImage[],
    additionalPrompt?: string
  ): Promise<PageImage> {
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

    // Add explicit instructions about reference images
    if (referenceImages.length > 0) {
      const refDescriptions = referenceImages.map(ref => `- ${ref.label}`).join('\n');
      prompt += `\n\n=== CRITICAL: REFERENCE IMAGES PROVIDED ===
I am providing ${referenceImages.length} reference image(s) that you MUST match:
${refDescriptions}

You MUST:
1. Match the EXACT art style, color palette, and rendering technique from the reference images
2. Keep ALL characters looking IDENTICAL to how they appear in the references (same proportions, colors, features, clothing)
3. Maintain the same level of detail, line weight, and shading style
4. Use the same background treatment and atmospheric style

This illustration must look like it belongs in the same book as the reference images.`;
    }

    // Log reference images being sent
    if (referenceImages.length > 0) {
      console.log(`[Page ${pageNumber}] Sending ${referenceImages.length} reference images:`);
      for (const ref of referenceImages) {
        console.log(`  - ${ref.type}: ${ref.label} (${ref.buffer.length} bytes)`);
      }
    } else {
      console.log(`[Page ${pageNumber}] No reference images`);
    }

    const startTime = Date.now();
    const generatedImage = await this.imageAdapter.generateWithReferences(
      sessionId,
      prompt,
      referenceImages,
      { aspectRatio: project.settings.aspectRatio }
    );

    // Save the image
    const imageId = `page-${pageNumber}`;
    const imagePath = await this.storage.saveImage(
      projectId,
      'pages',
      imageId,
      generatedImage.buffer
    );

    // Build reference info for metadata (without buffers)
    const referenceImageInfo: ReferenceImageInfo[] = referenceImages.map(ref => ({
      type: ref.type,
      label: ref.label,
      sourcePath: ref.type === 'previous-page' ? `page-${ref.label.replace('Page ', '')}` : undefined,
    }));

    // Build generation metadata
    const generationMetadata: GenerationMetadata = {
      sessionId,
      prompt,
      referenceImages: referenceImageInfo,
      modelUsed: this.imageAdapter.getModelInfo().id,
      generatedAt: new Date().toISOString(),
      generationTimeMs: Date.now() - startTime,
      aspectRatio: project.settings.aspectRatio,
      messageIndex: this.imageAdapter.getMessageIndex(sessionId),
    };

    const pageImage: PageImage = {
      pageNumber,
      imagePath,
      hasTextBaked: includeTextInImage && !!page.text,
      bakedText: includeTextInImage ? (page.text ?? undefined) : undefined,
      prompt,
      generatedAt: new Date().toISOString(),
      modelUsed: this.imageAdapter.getModelInfo().id,
      aspectRatio: project.settings.aspectRatio,
      generationMetadata,
    };

    return pageImage;
  }

  // Session-aware cover generation (Phase 2)
  private async generateCoverWithSession(projectId: string, sessionId: string): Promise<PageImage> {
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

    const startTime = Date.now();
    const generatedImage = await this.imageAdapter.generateWithReferences(
      sessionId,
      prompt,
      [], // No references for cover - it establishes the style
      { aspectRatio: project.settings.aspectRatio }
    );

    // Save the cover image
    const imagePath = await this.storage.saveImage(
      projectId,
      'cover',
      'front',
      generatedImage.buffer
    );

    // Build generation metadata
    const generationMetadata: GenerationMetadata = {
      sessionId,
      prompt,
      referenceImages: [],
      modelUsed: this.imageAdapter.getModelInfo().id,
      generatedAt: new Date().toISOString(),
      generationTimeMs: Date.now() - startTime,
      aspectRatio: project.settings.aspectRatio,
      messageIndex: this.imageAdapter.getMessageIndex(sessionId),
    };

    return {
      pageNumber: 0, // Cover is page 0
      imagePath,
      hasTextBaked: true,
      bakedText: project.outline.title,
      prompt,
      generatedAt: new Date().toISOString(),
      modelUsed: this.imageAdapter.getModelInfo().id,
      aspectRatio: project.settings.aspectRatio,
      imageType: 'cover',
      generationMetadata,
    };
  }

  // Session-aware back cover generation (Phase 2)
  private async generateBackCoverWithSession(projectId: string, sessionId: string): Promise<PageImage> {
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

    const startTime = Date.now();
    const generatedImage = await this.imageAdapter.generateWithReferences(
      sessionId,
      prompt,
      [], // No explicit references - session maintains context
      { aspectRatio: project.settings.aspectRatio }
    );

    // Save the back cover image
    const imagePath = await this.storage.saveImage(
      projectId,
      'cover',
      'back',
      generatedImage.buffer
    );

    // Build generation metadata
    const generationMetadata: GenerationMetadata = {
      sessionId,
      prompt,
      referenceImages: [],
      modelUsed: this.imageAdapter.getModelInfo().id,
      generatedAt: new Date().toISOString(),
      generationTimeMs: Date.now() - startTime,
      aspectRatio: project.settings.aspectRatio,
      messageIndex: this.imageAdapter.getMessageIndex(sessionId),
    };

    return {
      pageNumber: -1, // Back cover is page -1
      imagePath,
      hasTextBaked: true,
      bakedText: project.outline.backCoverBlurb,
      prompt,
      generatedAt: new Date().toISOString(),
      modelUsed: this.imageAdapter.getModelInfo().id,
      aspectRatio: project.settings.aspectRatio,
      imageType: 'back-cover',
      generationMetadata,
    };
  }
}

import { AspectRatio, ImageGenOptions, GeneratedImage, ImageModelInfo, ReferenceImage } from '@storybook-generator/shared';

export interface IImageGenerationAdapter {
  // Existing: Simple single-image generation (fallback)
  generateImage(
    prompt: string,
    options: ImageGenOptions
  ): Promise<GeneratedImage>;

  getModelInfo(): ImageModelInfo;

  getSupportedAspectRatios(): AspectRatio[];

  // Session-based generation methods (Phase 2)
  createSession(projectId: string): Promise<string>;

  generateWithReferences(
    sessionId: string,
    prompt: string,
    referenceImages: ReferenceImage[],
    options: ImageGenOptions
  ): Promise<GeneratedImage>;

  closeSession(sessionId: string): void;

  getMessageIndex(sessionId: string): number;
}

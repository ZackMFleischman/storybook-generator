import { AspectRatio, ImageGenOptions, GeneratedImage, ImageModelInfo } from '@storybook-generator/shared';

export interface IImageGenerationAdapter {
  generateImage(
    prompt: string,
    options: ImageGenOptions
  ): Promise<GeneratedImage>;

  getModelInfo(): ImageModelInfo;

  getSupportedAspectRatios(): AspectRatio[];
}

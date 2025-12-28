import { TextGenOptions, TextGenerationResponse, TextModelInfo } from '@storybook-generator/shared';

export interface ITextGenerationAdapter {
  generateText(
    systemPrompt: string,
    userPrompt: string,
    options?: TextGenOptions
  ): Promise<TextGenerationResponse>;

  generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    options?: TextGenOptions
  ): Promise<T>;

  getModelInfo(): TextModelInfo;
}

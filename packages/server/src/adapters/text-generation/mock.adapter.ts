import { TextGenOptions, TextGenerationResponse, TextModelInfo } from '@storybook-generator/shared';
import { ITextGenerationAdapter } from './text-generation.interface.js';

export class MockTextAdapter implements ITextGenerationAdapter {
  private responses: Map<string, string> = new Map();

  setResponse(promptContains: string, response: string): void {
    this.responses.set(promptContains, response);
  }

  async generateText(
    systemPrompt: string,
    userPrompt: string,
    options?: TextGenOptions
  ): Promise<TextGenerationResponse> {
    // Find matching response
    for (const [key, value] of this.responses) {
      if (userPrompt.includes(key) || systemPrompt.includes(key)) {
        return {
          text: value,
          usage: { inputTokens: 100, outputTokens: 200 },
          stopReason: 'end_turn',
        };
      }
    }

    return {
      text: 'Mock response for testing',
      usage: { inputTokens: 100, outputTokens: 200 },
      stopReason: 'end_turn',
    };
  }

  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    options?: TextGenOptions
  ): Promise<T> {
    const response = await this.generateText(systemPrompt, userPrompt, options);
    return JSON.parse(response.text) as T;
  }

  getModelInfo(): TextModelInfo {
    return {
      id: 'mock-text-model',
      name: 'Mock Text Model',
      provider: 'anthropic',
      maxContextTokens: 100000,
      supportsStreaming: false,
      supportsStructuredOutput: true,
    };
  }
}

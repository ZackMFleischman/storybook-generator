import Anthropic from '@anthropic-ai/sdk';
import { TextGenOptions, TextGenerationResponse, TextModelInfo } from '@storybook-generator/shared';
import { ITextGenerationAdapter } from './text-generation.interface.js';
import { getCacheKey, getTextCache, setTextCache } from '../../cache/index.js';

export class ClaudeAdapter implements ITextGenerationAdapter {
  private client: Anthropic;
  private modelId: string;

  constructor(apiKey: string, modelId: string = 'claude-opus-4-5-20251101') {
    this.client = new Anthropic({ apiKey });
    this.modelId = modelId;
  }

  async generateText(
    systemPrompt: string,
    userPrompt: string,
    options?: TextGenOptions & { skipCache?: boolean }
  ): Promise<TextGenerationResponse> {
    // Check cache first
    const cacheKey = getCacheKey(this.modelId, systemPrompt, userPrompt);
    if (!options?.skipCache) {
      const cached = await getTextCache(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as TextGenerationResponse;
        return parsed;
      }
    }

    const response = await this.client.messages.create({
      model: this.modelId,
      max_tokens: options?.maxTokens ?? 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    const text = textContent?.type === 'text' ? textContent.text : '';

    const result: TextGenerationResponse = {
      text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      stopReason: response.stop_reason === 'end_turn' ? 'end_turn' :
                  response.stop_reason === 'max_tokens' ? 'max_tokens' : 'end_turn',
    };

    // Store in cache
    await setTextCache(cacheKey, JSON.stringify(result));

    return result;
  }

  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    options?: TextGenOptions
  ): Promise<T> {
    const jsonSystemPrompt = `${systemPrompt}

IMPORTANT: You must respond with valid JSON only. No markdown code blocks, no explanations, just the raw JSON object.`;

    const response = await this.generateText(jsonSystemPrompt, userPrompt, options);

    // Try to parse the JSON response
    let jsonText = response.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    try {
      return JSON.parse(jsonText) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error}. Response was: ${jsonText.substring(0, 500)}`);
    }
  }

  getModelInfo(): TextModelInfo {
    return {
      id: this.modelId,
      name: this.modelId.includes('opus') ? 'Claude Opus 4.5' : 'Claude Sonnet 4.5',
      provider: 'anthropic',
      maxContextTokens: 200000,
      supportsStreaming: true,
      supportsStructuredOutput: true,
    };
  }
}

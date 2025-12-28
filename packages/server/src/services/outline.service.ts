import { Outline, GenerateOutlineRequest } from '@storybook-generator/shared';
import { ITextGenerationAdapter } from '../adapters/text-generation/index.js';
import { IStorageAdapter } from '../adapters/storage/index.js';
import { getOutlineSystemPrompt, getOutlineUserPrompt } from '../prompts/index.js';

export class OutlineService {
  constructor(
    private textAdapter: ITextGenerationAdapter,
    private storage: IStorageAdapter
  ) {}

  async generateOutline(request: GenerateOutlineRequest): Promise<Outline> {
    const { projectId, topic, targetAge, pageCount, toneKeywords, additionalInstructions } = request;

    // Load project to verify it exists
    const project = await this.storage.loadProject(projectId);

    const systemPrompt = getOutlineSystemPrompt(
      targetAge,
      pageCount,
      toneKeywords ?? project.settings.toneKeywords
    );

    const userPrompt = getOutlineUserPrompt(topic, additionalInstructions);

    const outline = await this.textAdapter.generateStructured<Outline>(
      systemPrompt,
      userPrompt,
      { maxTokens: 4096, temperature: 0.8 }
    );

    // Update project with the new outline
    project.outline = outline;
    project.currentStage = 'outline';
    project.updatedAt = new Date().toISOString();
    await this.storage.saveProject(project);

    return outline;
  }
}

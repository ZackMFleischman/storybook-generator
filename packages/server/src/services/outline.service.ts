import { Outline, GenerateOutlineRequest, RefineOutlineRequest } from '@storybook-generator/shared';
import { ITextGenerationAdapter } from '../adapters/text-generation/index.js';
import { IStorageAdapter } from '../adapters/storage/index.js';
import { getOutlineSystemPrompt, getOutlineUserPrompt, getOutlineRefinePrompt } from '../prompts/index.js';

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

  async refineOutline(request: RefineOutlineRequest): Promise<Outline> {
    const { projectId, feedback } = request;

    // Load project to get existing outline
    const project = await this.storage.loadProject(projectId);

    if (!project.outline) {
      throw new Error('No outline exists to refine');
    }

    const systemPrompt = getOutlineSystemPrompt(
      project.settings.targetAge,
      project.settings.targetPageCount,
      project.settings.toneKeywords
    );

    const userPrompt = getOutlineRefinePrompt(project.outline, feedback);

    const refinedOutline = await this.textAdapter.generateStructured<Outline>(
      systemPrompt,
      userPrompt,
      { maxTokens: 4096, temperature: 0.7 }
    );

    // Update project with the refined outline
    project.outline = refinedOutline;
    project.updatedAt = new Date().toISOString();
    await this.storage.saveProject(project);

    return refinedOutline;
  }
}

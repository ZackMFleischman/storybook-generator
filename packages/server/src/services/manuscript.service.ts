import { Manuscript, GenerateManuscriptRequest } from '@storybook-generator/shared';
import { ITextGenerationAdapter } from '../adapters/text-generation/index.js';
import { IStorageAdapter } from '../adapters/storage/index.js';
import { getManuscriptSystemPrompt, getManuscriptUserPrompt } from '../prompts/index.js';

export class ManuscriptService {
  constructor(
    private textAdapter: ITextGenerationAdapter,
    private storage: IStorageAdapter
  ) {}

  async generateManuscript(request: GenerateManuscriptRequest): Promise<Manuscript> {
    const { projectId, wordsPerPage, textStyle, additionalGuidance } = request;

    // Load project
    const project = await this.storage.loadProject(projectId);

    if (!project.outline) {
      throw new Error('Cannot generate manuscript: outline not found');
    }

    const targetWordsPerPage = wordsPerPage ?? (project.settings.targetAge === '3-5' ? 20 : 40);

    const systemPrompt = getManuscriptSystemPrompt(
      project.settings.targetAge,
      project.settings.targetPageCount,
      targetWordsPerPage,
      textStyle ?? 'narrative'
    );

    const userPrompt = getManuscriptUserPrompt(project.outline, additionalGuidance);

    const manuscript = await this.textAdapter.generateStructured<Manuscript>(
      systemPrompt,
      userPrompt,
      { maxTokens: 8192, temperature: 0.7 }
    );

    // Update project with the new manuscript
    project.manuscript = manuscript;
    project.currentStage = 'manuscript';
    project.updatedAt = new Date().toISOString();
    await this.storage.saveProject(project);

    return manuscript;
  }
}

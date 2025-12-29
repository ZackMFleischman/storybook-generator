import { v4 as uuidv4 } from 'uuid';
import {
  Project,
  ProjectSummary,
  CreateProjectRequest,
  DEFAULT_PROJECT_SETTINGS,
} from '@storybook-generator/shared';
import { IStorageAdapter } from '../adapters/storage/index.js';

export class ProjectService {
  constructor(private storage: IStorageAdapter) {}

  async createProject(request: CreateProjectRequest): Promise<Project> {
    const now = new Date().toISOString();

    const project: Project = {
      id: uuidv4(),
      name: request.name,
      topic: request.topic || '',
      createdAt: now,
      updatedAt: now,
      settings: {
        ...DEFAULT_PROJECT_SETTINGS,
        ...request.settings,
      },
      currentStage: 'outline',
      outline: null,
      manuscript: null,
      pageImages: [],
    };

    await this.storage.createProject(project);

    return project;
  }

  async getProject(projectId: string): Promise<Project> {
    return this.storage.loadProject(projectId);
  }

  async updateProject(project: Project): Promise<Project> {
    project.updatedAt = new Date().toISOString();
    await this.storage.saveProject(project);
    return project;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.storage.deleteProject(projectId);
  }

  async listProjects(): Promise<ProjectSummary[]> {
    return this.storage.listProjects();
  }
}

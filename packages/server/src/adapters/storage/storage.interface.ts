import { Project, ProjectSummary } from '@storybook-generator/shared';

export type ImageCategory = 'pages' | 'composed' | 'references';

export interface IStorageAdapter {
  // Project lifecycle
  createProject(project: Project): Promise<void>;
  loadProject(projectId: string): Promise<Project>;
  saveProject(project: Project): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
  listProjects(): Promise<ProjectSummary[]>;
  projectExists(projectId: string): Promise<boolean>;

  // Image operations
  saveImage(
    projectId: string,
    category: ImageCategory,
    imageId: string,
    buffer: Buffer
  ): Promise<string>;

  loadImage(
    projectId: string,
    category: ImageCategory,
    imageId: string
  ): Promise<Buffer>;

  deleteImage(
    projectId: string,
    category: ImageCategory,
    imageId: string
  ): Promise<void>;

  getImagePath(
    projectId: string,
    category: ImageCategory,
    imageId: string
  ): string;

  // Export operations
  saveExport(
    projectId: string,
    exportId: string,
    buffer: Buffer
  ): Promise<string>;

  loadExport(projectId: string, exportId: string): Promise<Buffer>;
}

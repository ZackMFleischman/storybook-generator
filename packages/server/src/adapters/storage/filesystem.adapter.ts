import fs from 'fs-extra';
import path from 'path';
import { Project, ProjectSummary } from '@storybook-generator/shared';
import { IStorageAdapter, ImageCategory } from './storage.interface.js';

export class FilesystemStorageAdapter implements IStorageAdapter {
  constructor(private basePath: string) {}

  private projectPath(projectId: string): string {
    return path.join(this.basePath, projectId);
  }

  private projectFile(projectId: string): string {
    return path.join(this.projectPath(projectId), 'project.json');
  }

  private imagePath(projectId: string, category: ImageCategory, imageId: string): string {
    return path.join(this.projectPath(projectId), 'images', category, `${imageId}.png`);
  }

  private exportPath(projectId: string, exportId: string): string {
    return path.join(this.projectPath(projectId), 'exports', `${exportId}.pdf`);
  }

  async createProject(project: Project): Promise<void> {
    const projectDir = this.projectPath(project.id);
    await fs.ensureDir(projectDir);
    await fs.ensureDir(path.join(projectDir, 'images', 'pages'));
    await fs.ensureDir(path.join(projectDir, 'images', 'composed'));
    await fs.ensureDir(path.join(projectDir, 'images', 'references'));
    await fs.ensureDir(path.join(projectDir, 'exports'));

    await fs.writeJson(this.projectFile(project.id), project, { spaces: 2 });
  }

  async loadProject(projectId: string): Promise<Project> {
    const filePath = this.projectFile(projectId);
    if (!(await fs.pathExists(filePath))) {
      throw new Error(`Project ${projectId} not found`);
    }
    return fs.readJson(filePath);
  }

  async saveProject(project: Project): Promise<void> {
    await fs.writeJson(this.projectFile(project.id), project, { spaces: 2 });
  }

  async deleteProject(projectId: string): Promise<void> {
    const projectDir = this.projectPath(projectId);
    if (await fs.pathExists(projectDir)) {
      await fs.remove(projectDir);
    }
  }

  async listProjects(): Promise<ProjectSummary[]> {
    await fs.ensureDir(this.basePath);
    const entries = await fs.readdir(this.basePath, { withFileTypes: true });
    const summaries: ProjectSummary[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const project = await this.loadProject(entry.name);
          summaries.push({
            id: project.id,
            name: project.name,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            currentStage: project.currentStage,
            thumbnailPath: project.coverImage?.imagePath || project.pageImages[0]?.imagePath,
            title: project.outline?.title,
            hasCoverImage: project.coverImage !== null,
            hasPageImages: project.pageImages.length > 0,
            firstPageNumber: project.pageImages[0]?.pageNumber,
          });
        } catch {
          // Skip invalid project directories
        }
      }
    }

    return summaries.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async projectExists(projectId: string): Promise<boolean> {
    return fs.pathExists(this.projectFile(projectId));
  }

  async saveImage(
    projectId: string,
    category: ImageCategory,
    imageId: string,
    buffer: Buffer
  ): Promise<string> {
    const imagePath = this.imagePath(projectId, category, imageId);
    await fs.ensureDir(path.dirname(imagePath));
    await fs.writeFile(imagePath, buffer);
    return imagePath;
  }

  async loadImage(
    projectId: string,
    category: ImageCategory,
    imageId: string
  ): Promise<Buffer> {
    const imagePath = this.imagePath(projectId, category, imageId);
    return fs.readFile(imagePath);
  }

  async deleteImage(
    projectId: string,
    category: ImageCategory,
    imageId: string
  ): Promise<void> {
    const imagePath = this.imagePath(projectId, category, imageId);
    if (await fs.pathExists(imagePath)) {
      await fs.remove(imagePath);
    }
  }

  getImagePath(
    projectId: string,
    category: ImageCategory,
    imageId: string
  ): string {
    return this.imagePath(projectId, category, imageId);
  }

  async saveExport(
    projectId: string,
    exportId: string,
    buffer: Buffer
  ): Promise<string> {
    const exportFilePath = this.exportPath(projectId, exportId);
    await fs.ensureDir(path.dirname(exportFilePath));
    await fs.writeFile(exportFilePath, buffer);
    return exportFilePath;
  }

  async loadExport(projectId: string, exportId: string): Promise<Buffer> {
    const exportFilePath = this.exportPath(projectId, exportId);
    return fs.readFile(exportFilePath);
  }
}

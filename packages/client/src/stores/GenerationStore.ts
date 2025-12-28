import { makeAutoObservable, runInAction } from 'mobx';
import { RootStore } from './RootStore';
import { TargetAge } from '@storybook-generator/shared';
import * as api from '../api/client';

export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

export class GenerationStore {
  status: GenerationStatus = 'idle';
  currentTask: string = '';
  progress: number = 0;
  totalSteps: number = 0;
  error: string | null = null;

  constructor(private rootStore: RootStore) {
    makeAutoObservable(this);
  }

  private setGenerating(task: string, total: number = 1): void {
    this.status = 'generating';
    this.currentTask = task;
    this.progress = 0;
    this.totalSteps = total;
    this.error = null;
  }

  private setSuccess(): void {
    this.status = 'success';
    this.currentTask = '';
    this.progress = 0;
    this.totalSteps = 0;
  }

  private setError(message: string): void {
    this.status = 'error';
    this.error = message;
  }

  reset(): void {
    this.status = 'idle';
    this.currentTask = '';
    this.progress = 0;
    this.totalSteps = 0;
    this.error = null;
  }

  get isGenerating(): boolean {
    return this.status === 'generating';
  }

  async generateOutline(
    topic: string,
    targetAge: TargetAge,
    pageCount: number,
    toneKeywords?: string[]
  ): Promise<boolean> {
    const { projectStore, uiStore } = this.rootStore;
    const project = projectStore.currentProject;

    if (!project) {
      this.setError('No project selected');
      return false;
    }

    this.setGenerating('Generating story outline...');

    try {
      const outline = await api.generateOutline({
        projectId: project.id,
        topic,
        targetAge,
        pageCount,
        toneKeywords,
      });

      runInAction(() => {
        projectStore.updateCurrentProject({
          outline,
          settings: {
            ...project.settings,
            targetAge,
            targetPageCount: pageCount,
            toneKeywords: toneKeywords || [],
          },
        });
        this.setSuccess();
        uiStore.nextStep();
      });

      return true;
    } catch (error) {
      runInAction(() => {
        this.setError(String(error));
      });
      return false;
    }
  }

  async generateManuscript(): Promise<boolean> {
    const { projectStore, uiStore } = this.rootStore;
    const project = projectStore.currentProject;

    if (!project) {
      this.setError('No project selected');
      return false;
    }

    if (!project.outline) {
      this.setError('Outline must be generated first');
      return false;
    }

    this.setGenerating('Generating manuscript pages...');

    try {
      const manuscript = await api.generateManuscript({
        projectId: project.id,
      });

      runInAction(() => {
        projectStore.updateCurrentProject({ manuscript });
        this.setSuccess();
        uiStore.nextStep();
      });

      return true;
    } catch (error) {
      runInAction(() => {
        this.setError(String(error));
      });
      return false;
    }
  }

  async generateIllustrations(): Promise<boolean> {
    const { projectStore } = this.rootStore;
    const project = projectStore.currentProject;

    if (!project) {
      this.setError('No project selected');
      return false;
    }

    if (!project.manuscript) {
      this.setError('Manuscript must be generated first');
      return false;
    }

    const totalPages = project.manuscript.pages.length;
    this.setGenerating('Generating illustrations...', totalPages);

    try {
      const pageImages = await api.generateAllPages({
        projectId: project.id,
        generationMode: 'sequential',
      });

      runInAction(() => {
        projectStore.updateCurrentProject({ pageImages });
        this.setSuccess();
      });

      return true;
    } catch (error) {
      runInAction(() => {
        this.setError(String(error));
      });
      return false;
    }
  }

  async exportPdf(): Promise<string | null> {
    const { projectStore } = this.rootStore;
    const project = projectStore.currentProject;

    if (!project) {
      this.setError('No project selected');
      return null;
    }

    this.setGenerating('Creating PDF...');

    try {
      const result = await api.exportPdf({
        projectId: project.id,
      });

      runInAction(() => {
        this.setSuccess();
      });

      return api.getExportDownloadUrl(project.id, result.exportId);
    } catch (error) {
      runInAction(() => {
        this.setError(String(error));
      });
      return null;
    }
  }
}

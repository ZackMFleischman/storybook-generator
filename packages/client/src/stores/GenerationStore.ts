import { makeAutoObservable, runInAction } from 'mobx';
import { RootStore } from './RootStore';
import { TargetAge, PageImage } from '@storybook-generator/shared';
import * as api from '../api/client';

export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

export class GenerationStore {
  status: GenerationStatus = 'idle';
  currentTask: string = '';
  progress: number = 0;
  totalSteps: number = 0;
  error: string | null = null;
  // Track the latest generated image for live preview
  latestImage: { image: PageImage; imageType: 'cover' | 'page' | 'back-cover' } | null = null;

  constructor(private rootStore: RootStore) {
    makeAutoObservable(this);
  }

  private setGenerating(task: string, total: number = 1): void {
    this.status = 'generating';
    this.currentTask = task;
    this.progress = 0;
    this.totalSteps = total;
    this.error = null;
    this.latestImage = null;
  }

  private setSuccess(): void {
    this.status = 'success';
    this.currentTask = '';
    this.progress = 0;
    this.totalSteps = 0;
    this.latestImage = null;
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
    this.latestImage = null;
  }

  get isGenerating(): boolean {
    return this.status === 'generating';
  }

  // Public methods for use by other stores (e.g., EditStore for refinement)
  startTask(taskName: string): void {
    this.setGenerating(taskName);
  }

  completeTask(): void {
    this.setSuccess();
  }

  failTask(error: string): void {
    this.setError(error);
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

    this.setGenerating(`Generating ${pageCount}-page story outline with Claude...`);

    try {
      const outline = await api.generateOutline({
        projectId: project.id,
        topic,
        targetAge,
        pageCount,
        toneKeywords,
      });

      // Update project name to story title and save topic
      if (outline.title) {
        await api.updateProject(project.id, { name: outline.title, topic });
      }

      runInAction(() => {
        const newName = outline.title || project.name;
        projectStore.updateCurrentProject({
          name: newName,
          topic,
          outline,
          settings: {
            ...project.settings,
            targetAge,
            targetPageCount: pageCount,
            toneKeywords: toneKeywords || [],
          },
        });
        // Update the project list entry too
        const listEntry = projectStore.projectList.find(p => p.id === project.id);
        if (listEntry) {
          listEntry.name = newName;
        }
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

    const pageCount = project.outline.plotPoints.length;
    this.setGenerating(`Writing ${pageCount}-page manuscript with Claude...`);

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

  private updateProgress(current: number, total: number, task: string): void {
    this.progress = current;
    this.totalSteps = total;
    this.currentTask = task;
  }

  async generateIllustrations(): Promise<boolean> {
    const { projectStore, uiStore } = this.rootStore;
    const project = projectStore.currentProject;

    if (!project) {
      this.setError('No project selected');
      return false;
    }

    if (!project.manuscript) {
      this.setError('Manuscript must be generated first');
      return false;
    }

    // Total steps = cover + pages + back cover
    const totalSteps = project.manuscript.pages.length + 2;
    this.setGenerating(`Generating ${totalSteps} illustrations with Gemini...`, totalSteps);

    try {
      const pageImages = await api.generateAllPagesWithProgress(
        {
          projectId: project.id,
          generationMode: 'sequential',
        },
        (current, total, message) => {
          runInAction(() => {
            this.updateProgress(current, total, message);
          });
        },
        (image: PageImage, imageType: 'cover' | 'page' | 'back-cover') => {
          // Update project store incrementally as each image completes
          runInAction(() => {
            // Track latest image for live preview
            this.latestImage = { image, imageType };

            if (imageType === 'cover') {
              projectStore.updateCurrentProject({ coverImage: image });
            } else if (imageType === 'back-cover') {
              projectStore.updateCurrentProject({ backCoverImage: image });
            } else {
              // Add page image to the array
              const currentImages = projectStore.currentProject?.pageImages || [];
              const existingIndex = currentImages.findIndex(p => p.pageNumber === image.pageNumber);
              let updatedImages: PageImage[];
              if (existingIndex >= 0) {
                updatedImages = [...currentImages];
                updatedImages[existingIndex] = image;
              } else {
                updatedImages = [...currentImages, image].sort((a, b) => a.pageNumber - b.pageNumber);
              }
              projectStore.updateCurrentProject({ pageImages: updatedImages });
            }
          });
        }
      );

      runInAction(() => {
        // Final update with complete pageImages array (covers were already updated)
        projectStore.updateCurrentProject({ pageImages });
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

  async exportPdf(): Promise<string | null> {
    const { projectStore } = this.rootStore;
    const project = projectStore.currentProject;

    if (!project) {
      this.setError('No project selected');
      return null;
    }

    this.setGenerating('Assembling PDF storybook...');

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

import { makeAutoObservable, runInAction } from 'mobx';
import { RootStore } from './RootStore';
import * as api from '../api/client';

export interface OutlineFeedback {
  overall?: string;
  title?: string;
  synopsis?: string;
  theme?: string;
  setting?: string;
  characters: Map<string, string>;
  plotPoints: Map<string, string>;
  coverDescription?: string;
  backCoverDescription?: string;
  backCoverBlurb?: string;
}

export interface ManuscriptFeedback {
  overall?: string;
  pages: Map<number, string>;
}

export interface IllustrationFeedbackState {
  cover?: string;
  backCover?: string;
  pages: Map<number, string>;
}

export class EditStore {
  outlineFeedback: OutlineFeedback = {
    characters: new Map(),
    plotPoints: new Map(),
  };

  manuscriptFeedback: ManuscriptFeedback = {
    pages: new Map(),
  };

  illustrationFeedback: IllustrationFeedbackState = {
    pages: new Map(),
  };

  isRefining = false;
  refineError: string | null = null;

  constructor(private rootStore: RootStore) {
    makeAutoObservable(this);
  }

  // Outline feedback methods
  setOutlineOverallFeedback(feedback: string): void {
    this.outlineFeedback.overall = feedback || undefined;
  }

  setOutlineTitleFeedback(feedback: string): void {
    this.outlineFeedback.title = feedback || undefined;
  }

  setOutlineSynopsisFeedback(feedback: string): void {
    this.outlineFeedback.synopsis = feedback || undefined;
  }

  setOutlineThemeFeedback(feedback: string): void {
    this.outlineFeedback.theme = feedback || undefined;
  }

  setOutlineSettingFeedback(feedback: string): void {
    this.outlineFeedback.setting = feedback || undefined;
  }

  setCharacterFeedback(characterId: string, feedback: string): void {
    if (feedback) {
      this.outlineFeedback.characters.set(characterId, feedback);
    } else {
      this.outlineFeedback.characters.delete(characterId);
    }
  }

  setPlotPointFeedback(plotPointId: string, feedback: string): void {
    if (feedback) {
      this.outlineFeedback.plotPoints.set(plotPointId, feedback);
    } else {
      this.outlineFeedback.plotPoints.delete(plotPointId);
    }
  }

  setCoverDescriptionFeedback(feedback: string): void {
    this.outlineFeedback.coverDescription = feedback || undefined;
  }

  setBackCoverDescriptionFeedback(feedback: string): void {
    this.outlineFeedback.backCoverDescription = feedback || undefined;
  }

  setBackCoverBlurbFeedback(feedback: string): void {
    this.outlineFeedback.backCoverBlurb = feedback || undefined;
  }

  // Manuscript feedback methods
  setManuscriptOverallFeedback(feedback: string): void {
    this.manuscriptFeedback.overall = feedback || undefined;
  }

  setPageFeedback(pageNumber: number, feedback: string): void {
    if (feedback) {
      this.manuscriptFeedback.pages.set(pageNumber, feedback);
    } else {
      this.manuscriptFeedback.pages.delete(pageNumber);
    }
  }

  // Check if there's any pending feedback
  get hasOutlineFeedback(): boolean {
    return !!(
      this.outlineFeedback.overall ||
      this.outlineFeedback.title ||
      this.outlineFeedback.synopsis ||
      this.outlineFeedback.theme ||
      this.outlineFeedback.setting ||
      this.outlineFeedback.characters.size > 0 ||
      this.outlineFeedback.plotPoints.size > 0 ||
      this.outlineFeedback.coverDescription ||
      this.outlineFeedback.backCoverDescription ||
      this.outlineFeedback.backCoverBlurb
    );
  }

  get hasManuscriptFeedback(): boolean {
    return !!(
      this.manuscriptFeedback.overall ||
      this.manuscriptFeedback.pages.size > 0
    );
  }

  get outlineFeedbackCount(): number {
    let count = 0;
    if (this.outlineFeedback.overall) count++;
    if (this.outlineFeedback.title) count++;
    if (this.outlineFeedback.synopsis) count++;
    if (this.outlineFeedback.theme) count++;
    if (this.outlineFeedback.setting) count++;
    count += this.outlineFeedback.characters.size;
    count += this.outlineFeedback.plotPoints.size;
    if (this.outlineFeedback.coverDescription) count++;
    if (this.outlineFeedback.backCoverDescription) count++;
    if (this.outlineFeedback.backCoverBlurb) count++;
    return count;
  }

  get manuscriptFeedbackCount(): number {
    let count = 0;
    if (this.manuscriptFeedback.overall) count++;
    count += this.manuscriptFeedback.pages.size;
    return count;
  }

  // Clear feedback
  clearOutlineFeedback(): void {
    this.outlineFeedback = {
      characters: new Map(),
      plotPoints: new Map(),
    };
  }

  clearManuscriptFeedback(): void {
    this.manuscriptFeedback = {
      pages: new Map(),
    };
  }

  clearAllFeedback(): void {
    this.clearOutlineFeedback();
    this.clearManuscriptFeedback();
    this.clearIllustrationFeedback();
  }

  // Apply feedback and regenerate
  async applyOutlineFeedback(): Promise<boolean> {
    const { projectStore } = this.rootStore;
    const project = projectStore.currentProject;

    if (!project || !this.hasOutlineFeedback) {
      return false;
    }

    this.isRefining = true;
    this.refineError = null;

    try {
      const feedback = {
        overall: this.outlineFeedback.overall,
        title: this.outlineFeedback.title,
        synopsis: this.outlineFeedback.synopsis,
        theme: this.outlineFeedback.theme,
        setting: this.outlineFeedback.setting,
        characters: Object.fromEntries(this.outlineFeedback.characters),
        plotPoints: Object.fromEntries(this.outlineFeedback.plotPoints),
        coverDescription: this.outlineFeedback.coverDescription,
        backCoverDescription: this.outlineFeedback.backCoverDescription,
        backCoverBlurb: this.outlineFeedback.backCoverBlurb,
      };

      const outline = await api.refineOutline({
        projectId: project.id,
        feedback,
      });

      runInAction(() => {
        projectStore.updateCurrentProject({ outline });
        this.clearOutlineFeedback();
        this.isRefining = false;
      });

      return true;
    } catch (error) {
      runInAction(() => {
        this.refineError = String(error);
        this.isRefining = false;
      });
      return false;
    }
  }

  async applyManuscriptFeedback(): Promise<boolean> {
    const { projectStore } = this.rootStore;
    const project = projectStore.currentProject;

    if (!project || !this.hasManuscriptFeedback) {
      return false;
    }

    this.isRefining = true;
    this.refineError = null;

    try {
      const feedback = {
        overall: this.manuscriptFeedback.overall,
        pages: Object.fromEntries(this.manuscriptFeedback.pages),
      };

      const manuscript = await api.refineManuscript({
        projectId: project.id,
        feedback,
      });

      runInAction(() => {
        projectStore.updateCurrentProject({ manuscript });
        this.clearManuscriptFeedback();
        this.isRefining = false;
      });

      return true;
    } catch (error) {
      runInAction(() => {
        this.refineError = String(error);
        this.isRefining = false;
      });
      return false;
    }
  }

  // Illustration feedback methods
  setCoverFeedback(feedback: string): void {
    this.illustrationFeedback.cover = feedback || undefined;
  }

  setBackCoverFeedback(feedback: string): void {
    this.illustrationFeedback.backCover = feedback || undefined;
  }

  setPageIllustrationFeedback(pageNumber: number, feedback: string): void {
    if (feedback) {
      this.illustrationFeedback.pages.set(pageNumber, feedback);
    } else {
      this.illustrationFeedback.pages.delete(pageNumber);
    }
  }

  get hasIllustrationFeedback(): boolean {
    return !!(
      this.illustrationFeedback.cover ||
      this.illustrationFeedback.backCover ||
      this.illustrationFeedback.pages.size > 0
    );
  }

  get illustrationFeedbackCount(): number {
    let count = 0;
    if (this.illustrationFeedback.cover) count++;
    if (this.illustrationFeedback.backCover) count++;
    count += this.illustrationFeedback.pages.size;
    return count;
  }

  clearIllustrationFeedback(): void {
    this.illustrationFeedback = {
      pages: new Map(),
    };
  }

  // Apply a single illustration refinement
  async applySingleIllustrationFeedback(target: 'cover' | 'back-cover' | number): Promise<boolean> {
    const { projectStore } = this.rootStore;
    const project = projectStore.currentProject;

    if (!project) {
      return false;
    }

    let feedback: string | undefined;
    if (target === 'cover') {
      feedback = this.illustrationFeedback.cover;
    } else if (target === 'back-cover') {
      feedback = this.illustrationFeedback.backCover;
    } else {
      feedback = this.illustrationFeedback.pages.get(target);
    }

    if (!feedback) {
      return false;
    }

    this.isRefining = true;
    this.refineError = null;

    try {
      const result = await api.refineIllustration({
        projectId: project.id,
        target,
        feedback,
      });

      runInAction(() => {
        // Update the project with the new image
        if (target === 'cover') {
          projectStore.updateCurrentProject({ coverImage: result });
          this.illustrationFeedback.cover = undefined;
        } else if (target === 'back-cover') {
          projectStore.updateCurrentProject({ backCoverImage: result });
          this.illustrationFeedback.backCover = undefined;
        } else {
          // Update page image in the array
          const pageImages = [...(project.pageImages || [])];
          const existingIndex = pageImages.findIndex(p => p.pageNumber === target);
          if (existingIndex >= 0) {
            pageImages[existingIndex] = result;
          } else {
            pageImages.push(result);
            pageImages.sort((a, b) => a.pageNumber - b.pageNumber);
          }
          projectStore.updateCurrentProject({ pageImages });
          this.illustrationFeedback.pages.delete(target);
        }
        this.isRefining = false;
      });

      return true;
    } catch (error) {
      runInAction(() => {
        this.refineError = String(error);
        this.isRefining = false;
      });
      return false;
    }
  }

  // Apply all illustration feedback at once
  async applyAllIllustrationFeedback(): Promise<boolean> {
    const { projectStore } = this.rootStore;
    const project = projectStore.currentProject;

    if (!project || !this.hasIllustrationFeedback) {
      return false;
    }

    this.isRefining = true;
    this.refineError = null;

    try {
      const feedback = {
        cover: this.illustrationFeedback.cover,
        backCover: this.illustrationFeedback.backCover,
        pages: Object.fromEntries(this.illustrationFeedback.pages),
      };

      const result = await api.refineAllIllustrations({
        projectId: project.id,
        feedback,
      });

      runInAction(() => {
        // Update cover if refined
        if (result.cover) {
          projectStore.updateCurrentProject({ coverImage: result.cover });
        }

        // Update back cover if refined
        if (result.backCover) {
          projectStore.updateCurrentProject({ backCoverImage: result.backCover });
        }

        // Update page images
        if (result.pages.length > 0) {
          const pageImages = [...(project.pageImages || [])];
          for (const newPageImage of result.pages) {
            const existingIndex = pageImages.findIndex(p => p.pageNumber === newPageImage.pageNumber);
            if (existingIndex >= 0) {
              pageImages[existingIndex] = newPageImage;
            } else {
              pageImages.push(newPageImage);
            }
          }
          pageImages.sort((a, b) => a.pageNumber - b.pageNumber);
          projectStore.updateCurrentProject({ pageImages });
        }

        this.clearIllustrationFeedback();
        this.isRefining = false;
      });

      return true;
    } catch (error) {
      runInAction(() => {
        this.refineError = String(error);
        this.isRefining = false;
      });
      return false;
    }
  }
}

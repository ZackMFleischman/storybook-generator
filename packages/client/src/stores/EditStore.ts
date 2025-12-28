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
}

export interface ManuscriptFeedback {
  overall?: string;
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
      this.outlineFeedback.plotPoints.size > 0
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
}

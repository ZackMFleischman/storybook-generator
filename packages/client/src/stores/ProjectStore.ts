import { makeAutoObservable, runInAction } from 'mobx';
import { Project, ProjectSummary, Outline, Character, PlotPoint, Setting, ManuscriptPage } from '@storybook-generator/shared';
import { RootStore } from './RootStore';
import * as api from '../api/client';

export class ProjectStore {
  currentProject: Project | null = null;
  projectList: ProjectSummary[] = [];
  isLoading = false;
  isSaving = false;
  error: string | null = null;

  constructor(_rootStore: RootStore) {
    makeAutoObservable(this);
  }

  async loadProjects(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const projects = await api.listProjects();
      runInAction(() => {
        this.projectList = projects;
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = String(error);
        this.isLoading = false;
      });
    }
  }

  async createProject(name: string): Promise<Project> {
    this.isLoading = true;
    this.error = null;

    try {
      const project = await api.createProject({ name });
      runInAction(() => {
        this.currentProject = project;
        this.projectList.unshift({
          id: project.id,
          name: project.name,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          currentStage: project.currentStage,
        });
        this.isLoading = false;
      });
      return project;
    } catch (error) {
      runInAction(() => {
        this.error = String(error);
        this.isLoading = false;
      });
      throw error;
    }
  }

  async loadProject(projectId: string): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const project = await api.getProject(projectId);
      runInAction(() => {
        this.currentProject = project;
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = String(error);
        this.isLoading = false;
      });
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      await api.deleteProject(projectId);
      runInAction(() => {
        this.projectList = this.projectList.filter(p => p.id !== projectId);
        if (this.currentProject?.id === projectId) {
          this.currentProject = null;
        }
      });
    } catch (error) {
      runInAction(() => {
        this.error = String(error);
      });
    }
  }

  setCurrentProject(project: Project | null): void {
    this.currentProject = project;
  }

  updateCurrentProject(updates: Partial<Project>): void {
    if (this.currentProject) {
      this.currentProject = { ...this.currentProject, ...updates };
    }
  }

  // Direct outline field updates (saves immediately)
  async updateOutlineField<K extends keyof Outline>(field: K, value: Outline[K]): Promise<void> {
    if (this.currentProject?.outline) {
      this.currentProject.outline = {
        ...this.currentProject.outline,
        [field]: value,
      };
      await this.saveProject();
    }
  }

  async updateCharacter(characterId: string, updates: Partial<Character>): Promise<void> {
    if (this.currentProject?.outline) {
      const characters = this.currentProject.outline.characters.map((char) =>
        char.id === characterId ? { ...char, ...updates } : char
      );
      this.currentProject.outline = {
        ...this.currentProject.outline,
        characters,
      };
      await this.saveProject();
    }
  }

  async updatePlotPoint(plotPointId: string, updates: Partial<PlotPoint>): Promise<void> {
    if (this.currentProject?.outline) {
      const plotPoints = this.currentProject.outline.plotPoints.map((point) =>
        point.id === plotPointId ? { ...point, ...updates } : point
      );
      this.currentProject.outline = {
        ...this.currentProject.outline,
        plotPoints,
      };
      await this.saveProject();
    }
  }

  async updateSetting(updates: Partial<Setting>): Promise<void> {
    if (this.currentProject?.outline) {
      this.currentProject.outline = {
        ...this.currentProject.outline,
        setting: { ...this.currentProject.outline.setting, ...updates },
      };
      await this.saveProject();
    }
  }

  // Direct manuscript page updates (saves immediately)
  async updateManuscriptPage(pageNumber: number, updates: Partial<ManuscriptPage>): Promise<void> {
    if (this.currentProject?.manuscript) {
      const pages = this.currentProject.manuscript.pages.map((page) =>
        page.pageNumber === pageNumber ? { ...page, ...updates } : page
      );
      this.currentProject.manuscript = {
        ...this.currentProject.manuscript,
        pages,
      };
      await this.saveProject();
    }
  }

  // Save project to server
  async saveProject(): Promise<void> {
    if (!this.currentProject) {
      return;
    }

    this.isSaving = true;
    this.error = null;

    try {
      const updatedProject = await api.updateProject(this.currentProject.id, {
        outline: this.currentProject.outline,
        manuscript: this.currentProject.manuscript,
        updatedAt: new Date().toISOString(),
      });
      runInAction(() => {
        this.currentProject = updatedProject;
        this.isSaving = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = String(error);
        this.isSaving = false;
      });
      throw error;
    }
  }
}

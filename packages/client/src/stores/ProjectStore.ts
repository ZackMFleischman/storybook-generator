import { makeAutoObservable, runInAction } from 'mobx';
import { Project, ProjectSummary } from '@storybook-generator/shared';
import { RootStore } from './RootStore';
import * as api from '../api/client';

export class ProjectStore {
  currentProject: Project | null = null;
  projectList: ProjectSummary[] = [];
  isLoading = false;
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
}

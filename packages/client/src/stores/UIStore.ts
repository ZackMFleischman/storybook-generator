import { makeAutoObservable } from 'mobx';
import { RootStore } from './RootStore';

export type WizardStep = 'topic' | 'outline' | 'manuscript' | 'illustrations';

export class UIStore {
  currentStep: WizardStep = 'topic';
  isSidebarOpen = false;

  constructor(private rootStore: RootStore) {
    makeAutoObservable(this);
  }

  setStep(step: WizardStep): void {
    this.currentStep = step;
  }

  nextStep(): void {
    const steps: WizardStep[] = ['topic', 'outline', 'manuscript', 'illustrations'];
    const currentIndex = steps.indexOf(this.currentStep);
    if (currentIndex < steps.length - 1) {
      this.currentStep = steps[currentIndex + 1];
    }
  }

  previousStep(): void {
    const steps: WizardStep[] = ['topic', 'outline', 'manuscript', 'illustrations'];
    const currentIndex = steps.indexOf(this.currentStep);
    if (currentIndex > 0) {
      this.currentStep = steps[currentIndex - 1];
    }
  }

  get stepIndex(): number {
    const steps: WizardStep[] = ['topic', 'outline', 'manuscript', 'illustrations'];
    return steps.indexOf(this.currentStep);
  }

  get canGoBack(): boolean {
    return this.stepIndex > 0;
  }

  get canGoNext(): boolean {
    const project = this.rootStore.projectStore.currentProject;
    if (!project) return false;

    switch (this.currentStep) {
      case 'topic':
        return project.outline !== null;
      case 'outline':
        return project.manuscript !== null;
      case 'manuscript':
        return project.pageImages.length > 0;
      case 'illustrations':
        return false;
      default:
        return false;
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  resetWizard(): void {
    this.currentStep = 'topic';
  }

  navigateToProjectState(): void {
    const project = this.rootStore.projectStore.currentProject;
    if (!project) {
      this.currentStep = 'topic';
      return;
    }

    // Navigate to the furthest completed step
    if (project.pageImages && project.pageImages.length > 0) {
      this.currentStep = 'illustrations';
    } else if (project.manuscript) {
      this.currentStep = 'manuscript';
    } else if (project.outline) {
      this.currentStep = 'outline';
    } else {
      this.currentStep = 'topic';
    }
  }
}

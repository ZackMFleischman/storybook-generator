import { makeAutoObservable } from 'mobx';
import { RootStore } from './RootStore';

export type WizardStep = 'topic' | 'outline' | 'manuscript' | 'illustrations';

const LAST_STEP_KEY = 'storybook-generator-last-step';

export class UIStore {
  currentStep: WizardStep = 'topic';
  isSidebarOpen = false;

  constructor(private rootStore: RootStore) {
    makeAutoObservable(this);
  }

  private saveLastStep(step: WizardStep): void {
    try {
      localStorage.setItem(LAST_STEP_KEY, step);
    } catch {
      // localStorage might not be available
    }
  }

  getLastStep(): WizardStep | null {
    try {
      const step = localStorage.getItem(LAST_STEP_KEY);
      if (step && ['topic', 'outline', 'manuscript', 'illustrations'].includes(step)) {
        return step as WizardStep;
      }
      return null;
    } catch {
      return null;
    }
  }

  setStep(step: WizardStep): void {
    this.currentStep = step;
    this.saveLastStep(step);
  }

  nextStep(): void {
    const steps: WizardStep[] = ['topic', 'outline', 'manuscript', 'illustrations'];
    const currentIndex = steps.indexOf(this.currentStep);
    if (currentIndex < steps.length - 1) {
      this.setStep(steps[currentIndex + 1]);
    }
  }

  previousStep(): void {
    const steps: WizardStep[] = ['topic', 'outline', 'manuscript', 'illustrations'];
    const currentIndex = steps.indexOf(this.currentStep);
    if (currentIndex > 0) {
      this.setStep(steps[currentIndex - 1]);
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
    this.setStep('topic');
  }

  navigateToProjectState(): void {
    const project = this.rootStore.projectStore.currentProject;
    if (!project) {
      this.setStep('topic');
      return;
    }

    // Navigate to the furthest completed step
    if (project.pageImages && project.pageImages.length > 0) {
      this.setStep('illustrations');
    } else if (project.manuscript) {
      this.setStep('manuscript');
    } else if (project.outline) {
      this.setStep('outline');
    } else {
      this.setStep('topic');
    }
  }
}

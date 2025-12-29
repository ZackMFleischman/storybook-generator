import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import styled from '@emotion/styled';
import { useProjectStore, useUIStore, useGenerationStore } from './stores/RootStore';
import { TopicInput } from './components/TopicInput';
import { OutlineView } from './components/OutlineView';
import { ManuscriptView } from './components/ManuscriptView';
import { IllustrationsExport } from './components/IllustrationsExport';
import { ProjectSidebar } from './components/ProjectSidebar';
import { LandingPage } from './components/LandingPage';
import type { WizardStep } from './stores/UIStore';

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--background-color);
`;

const Header = styled.header`
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.25rem 0.5rem;
  line-height: 1;

  &:hover {
    color: var(--primary-color);
  }
`;

const Logo = styled.h1<{ clickable?: boolean }>`
  font-size: 1.5rem;
  color: var(--primary-color);
  margin: 0;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};

  &:hover {
    opacity: ${props => props.clickable ? 0.8 : 1};
  }
`;

const ProjectTitle = styled.span`
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 400;
  margin-left: 0.5rem;
  padding-left: 0.75rem;
  border-left: 1px solid var(--border-color);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StepperContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const Step = styled.div<{ active: boolean; completed: boolean; clickable: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  background: ${props => props.active ? 'var(--primary-color)' : props.completed ? 'var(--success-color)' : 'var(--border-color)'};
  color: ${props => props.active || props.completed ? 'white' : 'var(--text-secondary)'};
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};

  &:hover {
    opacity: ${props => props.clickable ? 0.85 : 1};
  }
`;

const StepNumber = styled.span`
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  font-size: 0.75rem;
`;

const StepConnector = styled.div`
  width: 2rem;
  height: 2px;
  background: var(--border-color);
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const LoadingOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const LoadingCard = styled.div`
  background: var(--surface-color);
  padding: 2rem 3rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  text-align: center;
`;

const Spinner = styled.div`
  width: 3rem;
  height: 3rem;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ProgressContainer = styled.div`
  margin-top: 1rem;
  width: 100%;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ percent: number }>`
  height: 100%;
  background: var(--primary-color);
  border-radius: 4px;
  width: ${props => props.percent}%;
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
`;

const steps: { key: WizardStep; label: string }[] = [
  { key: 'topic', label: 'Topic' },
  { key: 'outline', label: 'Outline' },
  { key: 'manuscript', label: 'Manuscript' },
  { key: 'illustrations', label: 'Illustrations' },
];

export const App = observer(function App() {
  const projectStore = useProjectStore();
  const uiStore = useUIStore();
  const generationStore = useGenerationStore();

  // Load projects on mount and restore last session
  useEffect(() => {
    const initializeApp = async () => {
      await projectStore.loadProjects();

      // Try to restore last session
      const lastProjectId = projectStore.getLastProjectId();
      if (lastProjectId) {
        try {
          await projectStore.loadProject(lastProjectId);
          // Restore last step if available, otherwise navigate to project state
          const lastStep = uiStore.getLastStep();
          if (lastStep) {
            uiStore.setStep(lastStep);
          } else {
            uiStore.navigateToProjectState();
          }
        } catch {
          // Project might have been deleted, clear the stored ID
          projectStore.clearLastProjectId();
        }
      }
    };

    initializeApp();
  }, [projectStore, uiStore]);

  const renderStep = () => {
    switch (uiStore.currentStep) {
      case 'topic':
        return <TopicInput />;
      case 'outline':
        return <OutlineView />;
      case 'manuscript':
        return <ManuscriptView />;
      case 'illustrations':
        return <IllustrationsExport />;
      default:
        return <TopicInput />;
    }
  };

  const getStepCompleted = (stepKey: WizardStep): boolean => {
    const project = projectStore.currentProject;
    if (!project) return false;

    switch (stepKey) {
      case 'topic':
        return project.outline !== null;
      case 'outline':
        return project.outline !== null;
      case 'manuscript':
        return project.manuscript !== null;
      case 'illustrations':
        return project.manuscript !== null && project.pageImages.length >= project.manuscript.pages.length;
      default:
        return false;
    }
  };

  const isStepClickable = (stepKey: WizardStep): boolean => {
    const project = projectStore.currentProject;
    if (!project) return false;
    if (stepKey === uiStore.currentStep) return false; // Already on this step

    // Can always go back to topic
    if (stepKey === 'topic') return true;

    // Can go to outline if it exists
    if (stepKey === 'outline') return project.outline !== null;

    // Can go to manuscript if it exists
    if (stepKey === 'manuscript') return project.manuscript !== null;

    // Can go to illustrations if they exist
    if (stepKey === 'illustrations') return project.pageImages.length > 0;

    return false;
  };

  const handleStepClick = (stepKey: WizardStep) => {
    if (isStepClickable(stepKey)) {
      uiStore.setStep(stepKey);
    }
  };

  const handleLogoClick = () => {
    if (projectStore.currentProject) {
      projectStore.setCurrentProject(null);
    }
  };

  return (
    <AppContainer>
      <ProjectSidebar />

      <Header>
        <HeaderLeft>
          <MenuButton onClick={() => uiStore.toggleSidebar()} title="Projects">
            &#9776;
          </MenuButton>
          <Logo
            clickable={!!projectStore.currentProject}
            onClick={handleLogoClick}
            title={projectStore.currentProject ? 'Back to all projects' : ''}
          >
            Storybook Generator
          </Logo>
          {projectStore.currentProject && (
            <ProjectTitle>
              {projectStore.currentProject.outline?.title || projectStore.currentProject.name}
            </ProjectTitle>
          )}
        </HeaderLeft>
        {projectStore.currentProject && (
          <StepperContainer>
            {steps.map((step, index) => (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
                <Step
                  active={uiStore.currentStep === step.key}
                  completed={getStepCompleted(step.key)}
                  clickable={isStepClickable(step.key)}
                  onClick={() => handleStepClick(step.key)}
                >
                  <StepNumber>{index + 1}</StepNumber>
                  {step.label}
                </Step>
                {index < steps.length - 1 && <StepConnector />}
              </div>
            ))}
          </StepperContainer>
        )}
      </Header>

      <MainContent>
        {!projectStore.currentProject ? (
          <LandingPage />
        ) : (
          renderStep()
        )}
      </MainContent>

      {generationStore.isGenerating && (
        <LoadingOverlay>
          <LoadingCard>
            <Spinner />
            <p style={{ margin: 0, color: 'var(--text-primary)' }}>
              {generationStore.currentTask}
            </p>
            {generationStore.totalSteps > 1 && (
              <ProgressContainer>
                <ProgressBar>
                  <ProgressFill
                    percent={(generationStore.progress / generationStore.totalSteps) * 100}
                  />
                </ProgressBar>
                <ProgressText>
                  {generationStore.progress} of {generationStore.totalSteps} complete
                </ProgressText>
              </ProgressContainer>
            )}
          </LoadingCard>
        </LoadingOverlay>
      )}
    </AppContainer>
  );
});

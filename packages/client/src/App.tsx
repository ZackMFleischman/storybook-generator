import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import styled from '@emotion/styled';
import { useProjectStore, useUIStore, useGenerationStore } from './stores/RootStore';
import { TopicInput } from './components/TopicInput';
import { OutlineView } from './components/OutlineView';
import { ManuscriptView } from './components/ManuscriptView';
import { IllustrationsExport } from './components/IllustrationsExport';
import { ProjectSidebar } from './components/ProjectSidebar';
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

const Logo = styled.h1`
  font-size: 1.5rem;
  color: var(--primary-color);
  margin: 0;
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

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  text-align: center;
  color: var(--text-secondary);
`;

const EmptyStateTitle = styled.h2`
  color: var(--text-primary);
  margin-bottom: 0.5rem;
`;

const CreateButton = styled.button`
  margin-top: 1.5rem;
  padding: 0.75rem 2rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: var(--primary-hover);
  }
`;

const StepperContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const Step = styled.div<{ active: boolean; completed: boolean }>`
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

  // Load projects on mount
  useEffect(() => {
    projectStore.loadProjects();
  }, [projectStore]);

  const handleCreateFirst = async () => {
    const name = `Storybook ${new Date().toLocaleDateString()}`;
    await projectStore.createProject(name);
  };

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
        return project.manuscript !== null;
      case 'manuscript':
        return project.pageImages.length > 0;
      case 'illustrations':
        return false;
      default:
        return false;
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
          <Logo>Storybook Generator</Logo>
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
          <EmptyState>
            <EmptyStateTitle>Welcome to Storybook Generator</EmptyStateTitle>
            <p>Create AI-illustrated children's picture books from a simple topic.</p>
            <CreateButton onClick={handleCreateFirst}>
              Create Your First Storybook
            </CreateButton>
          </EmptyState>
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
          </LoadingCard>
        </LoadingOverlay>
      )}
    </AppContainer>
  );
});

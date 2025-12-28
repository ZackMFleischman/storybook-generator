import { observer } from 'mobx-react-lite';
import styled from '@emotion/styled';
import { useProjectStore, useGenerationStore, useUIStore, useEditStore } from '../stores/RootStore';
import { EditableSection } from './EditableSection';
import type { ManuscriptPage } from '@storybook-generator/shared';

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding-bottom: 5rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
`;

const TitleSection = styled.div``;

const Title = styled.h2`
  color: var(--text-primary);
  margin: 0 0 0.25rem;
`;

const Subtitle = styled.p`
  color: var(--text-secondary);
  margin: 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'warning' }>`
  padding: 0.75rem 1.25rem;
  background: ${props => {
    if (props.variant === 'secondary') return 'transparent';
    if (props.variant === 'warning') return 'var(--secondary-color)';
    return 'var(--primary-color)';
  }};
  color: ${props => props.variant === 'secondary' ? 'var(--text-secondary)' : 'white'};
  border: ${props => props.variant === 'secondary' ? '1px solid var(--border-color)' : 'none'};
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const OverallFeedbackCard = styled.div`
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const OverallFeedbackText = styled.p`
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
`;

const PageGrid = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const PageCard = styled.div`
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 1fr;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PageTextSection = styled.div`
  padding: 1.5rem;
  border-right: 1px solid var(--border-color);

  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
`;

const PageNumber = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 1rem;
`;

const PageText = styled.p`
  color: var(--text-primary);
  font-size: 1.125rem;
  line-height: 1.7;
  margin: 0;
  font-family: 'Georgia', serif;
`;

const NoText = styled.p`
  color: var(--text-secondary);
  font-style: italic;
  margin: 0;
`;

const PageIllustrationSection = styled.div`
  padding: 1.5rem;
  background: var(--background-color);
`;

const SectionLabel = styled.h4`
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.75rem;
`;

const IllustrationDescription = styled.p`
  color: var(--text-primary);
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0 0 1rem;
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`;

const MetaItem = styled.div``;

const MetaLabel = styled.span`
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
`;

const MetaValue = styled.span`
  color: var(--text-primary);
  font-size: 0.875rem;
`;

const CharacterTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

const Tag = styled.span`
  background: var(--primary-color);
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  color: var(--error-color);
  margin-bottom: 1rem;
`;

const FloatingBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface-color);
  border-top: 1px solid var(--border-color);
  padding: 1rem 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  box-shadow: var(--shadow-lg);
  z-index: 100;
`;

const FeedbackCount = styled.span`
  color: var(--text-secondary);
  font-size: 0.875rem;
`;

export const ManuscriptView = observer(function ManuscriptView() {
  const projectStore = useProjectStore();
  const generationStore = useGenerationStore();
  const uiStore = useUIStore();
  const editStore = useEditStore();

  const project = projectStore.currentProject;
  const manuscript = project?.manuscript;
  const outline = project?.outline;
  const isLoading = generationStore.isGenerating || editStore.isRefining;

  // Create a map of character IDs to names
  const characterNames = new Map<string, string>();
  outline?.characters.forEach((char) => {
    characterNames.set(char.id, char.name);
  });

  const getCharacterName = (charId: string): string => {
    return characterNames.get(charId) || charId;
  };

  if (!manuscript) {
    return (
      <Container>
        <Title>No Manuscript Generated</Title>
        <Button variant="secondary" onClick={() => uiStore.previousStep()}>
          Go Back
        </Button>
      </Container>
    );
  }

  const handleGenerateIllustrations = async () => {
    await generationStore.generateIllustrations();
  };

  const handleApplyChanges = async () => {
    await editStore.applyManuscriptFeedback();
  };

  return (
    <Container>
      <Header>
        <TitleSection>
          <Title>Manuscript</Title>
          <Subtitle>
            {manuscript.pages.length} pages ready for illustration. Hover over pages to add feedback.
          </Subtitle>
        </TitleSection>
        <ButtonGroup>
          <Button variant="secondary" onClick={() => uiStore.previousStep()}>
            Back
          </Button>
          <Button onClick={handleGenerateIllustrations} disabled={isLoading || editStore.hasManuscriptFeedback}>
            {isLoading ? 'Generating...' : 'Generate Illustrations'}
          </Button>
        </ButtonGroup>
      </Header>

      {(generationStore.error || editStore.refineError) && (
        <ErrorMessage>{generationStore.error || editStore.refineError}</ErrorMessage>
      )}

      <EditableSection
        sectionLabel="Overall Manuscript"
        feedback={editStore.manuscriptFeedback.overall}
        onFeedbackChange={(f) => editStore.setManuscriptOverallFeedback(f)}
      >
        <OverallFeedbackCard>
          <OverallFeedbackText>
            Add overall feedback about the manuscript here (tone, pacing, style, etc.)
          </OverallFeedbackText>
        </OverallFeedbackCard>
      </EditableSection>

      <PageGrid>
        {manuscript.pages.map((page: ManuscriptPage) => (
          <EditableSection
            key={page.pageNumber}
            sectionLabel={`Page ${page.pageNumber}`}
            feedback={editStore.manuscriptFeedback.pages.get(page.pageNumber)}
            onFeedbackChange={(f) => editStore.setPageFeedback(page.pageNumber, f)}
          >
            <PageCard>
              <PageTextSection>
                <PageNumber>{page.pageNumber}</PageNumber>
                {page.text ? (
                  <PageText>{page.text}</PageText>
                ) : (
                  <NoText>No text on this page</NoText>
                )}
              </PageTextSection>
              <PageIllustrationSection>
                <SectionLabel>Illustration Brief</SectionLabel>
                <IllustrationDescription>
                  {page.illustrationDescription}
                </IllustrationDescription>
                <MetaGrid>
                  <MetaItem>
                    <MetaLabel>Mood</MetaLabel>
                    <MetaValue>{page.mood}</MetaValue>
                  </MetaItem>
                  <MetaItem>
                    <MetaLabel>Action</MetaLabel>
                    <MetaValue>{page.action}</MetaValue>
                  </MetaItem>
                </MetaGrid>
                {page.characters.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <MetaLabel>Characters</MetaLabel>
                    <CharacterTags>
                      {page.characters.map((charId: string) => (
                        <Tag key={charId}>{getCharacterName(charId)}</Tag>
                      ))}
                    </CharacterTags>
                  </div>
                )}
              </PageIllustrationSection>
            </PageCard>
          </EditableSection>
        ))}
      </PageGrid>

      {editStore.hasManuscriptFeedback && (
        <FloatingBar>
          <FeedbackCount>
            {editStore.manuscriptFeedbackCount} pending edit{editStore.manuscriptFeedbackCount !== 1 ? 's' : ''}
          </FeedbackCount>
          <Button variant="secondary" onClick={() => editStore.clearManuscriptFeedback()}>
            Clear All
          </Button>
          <Button variant="warning" onClick={handleApplyChanges} disabled={isLoading}>
            {isLoading ? 'Applying...' : 'Apply Changes'}
          </Button>
        </FloatingBar>
      )}
    </Container>
  );
});

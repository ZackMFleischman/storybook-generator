import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import styled from '@emotion/styled';
import { useProjectStore, useGenerationStore, useUIStore } from '../stores/RootStore';
import { getImageUrl } from '../api/client';
import type { PageImage } from '@storybook-generator/shared';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
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

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'success' }>`
  padding: 0.75rem 1.25rem;
  background: ${props => {
    if (props.variant === 'secondary') return 'transparent';
    if (props.variant === 'success') return 'var(--success-color)';
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

const PageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-bottom: 2rem;
`;

const PageCard = styled.div`
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
`;

const ImageContainer = styled.div`
  background: var(--background-color);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const Image = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
`;

const PlaceholderImage = styled.div`
  color: var(--text-secondary);
  text-align: center;
  padding: 2rem;
`;

const PageInfo = styled.div`
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const PageLabel = styled.div`
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
`;

const PageMeta = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary);
`;

const PageText = styled.div`
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--background-color);
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md);
  border-left: 3px solid var(--primary-color);
  font-style: italic;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
`;

const EmptyTitle = styled.h3`
  color: var(--text-primary);
  margin: 0 0 0.5rem;
`;

const EmptyText = styled.p`
  color: var(--text-secondary);
  margin: 0 0 1.5rem;
`;

const SuccessMessage = styled.div`
  padding: 1rem;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: var(--radius-md);
  color: var(--success-color);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  color: var(--error-color);
  margin-bottom: 1rem;
`;

const ExportSection = styled.div`
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ExportInfo = styled.div``;

const ExportTitle = styled.h3`
  color: var(--text-primary);
  margin: 0 0 0.25rem;
`;

const ExportDescription = styled.p`
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.875rem;
`;

export const IllustrationsExport = observer(function IllustrationsExport() {
  const projectStore = useProjectStore();
  const generationStore = useGenerationStore();
  const uiStore = useUIStore();

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const project = projectStore.currentProject;
  const pageImages = project?.pageImages || [];
  const manuscript = project?.manuscript;
  const isLoading = generationStore.isGenerating;

  const handleGenerateIllustrations = async () => {
    await generationStore.generateIllustrations();
  };

  const handleExportPdf = async () => {
    const url = await generationStore.exportPdf();
    if (url) {
      setDownloadUrl(url);
      // Auto-download the PDF
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.name || 'storybook'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (pageImages.length === 0) {
    return (
      <Container>
        <Header>
          <TitleSection>
            <Title>Illustrations</Title>
            <Subtitle>Generate illustrations for your storybook</Subtitle>
          </TitleSection>
          <Button variant="secondary" onClick={() => uiStore.previousStep()}>
            Back
          </Button>
        </Header>

        {generationStore.error && (
          <ErrorMessage>{generationStore.error}</ErrorMessage>
        )}

        <EmptyState>
          <EmptyTitle>No Illustrations Yet</EmptyTitle>
          <EmptyText>
            Generate illustrations for all {manuscript?.pages.length || 0} pages of your storybook.
          </EmptyText>
          <Button onClick={handleGenerateIllustrations} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate All Illustrations'}
          </Button>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <TitleSection>
          <Title>Illustrations</Title>
          <Subtitle>
            {pageImages.length} of {manuscript?.pages.length || 0} pages illustrated
          </Subtitle>
        </TitleSection>
        <ButtonGroup>
          <Button variant="secondary" onClick={() => uiStore.previousStep()}>
            Back
          </Button>
        </ButtonGroup>
      </Header>

      {generationStore.error && (
        <ErrorMessage>{generationStore.error}</ErrorMessage>
      )}

      {downloadUrl && (
        <SuccessMessage>
          <span>PDF downloaded!</span>
          <Button variant="success" onClick={() => window.open(downloadUrl, '_blank')}>
            Download Again
          </Button>
        </SuccessMessage>
      )}

      <PageList>
        {pageImages
          .slice()
          .sort((a: PageImage, b: PageImage) => a.pageNumber - b.pageNumber)
          .map((pageImage: PageImage) => {
            const manuscriptPage = manuscript?.pages.find(p => p.pageNumber === pageImage.pageNumber);
            return (
              <PageCard key={pageImage.pageNumber}>
                <ImageContainer>
                  {project ? (
                    <Image
                      src={getImageUrl(project.id, 'pages', `page-${pageImage.pageNumber}`)}
                      alt={`Page ${pageImage.pageNumber}`}
                    />
                  ) : (
                    <PlaceholderImage>No image</PlaceholderImage>
                  )}
                </ImageContainer>
                <PageInfo>
                  <PageHeader>
                    <PageLabel>Page {pageImage.pageNumber}</PageLabel>
                    <PageMeta>
                      {pageImage.hasTextBaked ? 'Text in image' : 'Text overlay'}
                    </PageMeta>
                  </PageHeader>
                  {manuscriptPage?.text && (
                    <PageText>{manuscriptPage.text}</PageText>
                  )}
                </PageInfo>
              </PageCard>
            );
          })}
      </PageList>

      <ExportSection>
        <ExportInfo>
          <ExportTitle>Export Your Storybook</ExportTitle>
          <ExportDescription>
            Download your complete storybook as a print-ready PDF file.
          </ExportDescription>
        </ExportInfo>
        <Button onClick={handleExportPdf} disabled={isLoading}>
          {isLoading ? 'Creating PDF...' : 'Export as PDF'}
        </Button>
      </ExportSection>
    </Container>
  );
});

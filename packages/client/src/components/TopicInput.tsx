import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import styled from '@emotion/styled';
import { useGenerationStore, useProjectStore } from '../stores/RootStore';
import type { TargetAge } from '@storybook-generator/shared';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const Title = styled.h2`
  color: var(--text-primary);
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: var(--text-secondary);
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: var(--text-primary);
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 1rem;
  background: var(--surface-color);

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

const Button = styled.button`
  padding: 0.875rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: #4f46e5;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  color: var(--error-color);
`;

export const TopicInput = observer(function TopicInput() {
  const generationStore = useGenerationStore();
  const projectStore = useProjectStore();

  const [topic, setTopic] = useState('');
  const [targetAge, setTargetAge] = useState<TargetAge>('3-5');
  const [pageCount, setPageCount] = useState(12);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!topic.trim()) return;

    await generationStore.generateOutline(topic, targetAge, pageCount);
  };

  const isLoading = generationStore.isGenerating || projectStore.isLoading;

  return (
    <Container>
      <Title>Create Your Story</Title>
      <Subtitle>
        Enter a topic and we'll generate a complete illustrated children's book for you.
      </Subtitle>

      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="topic">Story Topic</Label>
          <TextArea
            id="topic"
            placeholder="A curious little rabbit who learns to share with friends..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isLoading}
          />
        </FormGroup>

        <Row>
          <FormGroup>
            <Label htmlFor="age">Target Age</Label>
            <Select
              id="age"
              value={targetAge}
              onChange={(e) => setTargetAge(e.target.value as TargetAge)}
              disabled={isLoading}
            >
              <option value="3-5">Ages 3-5 (Simple)</option>
              <option value="5-8">Ages 5-8 (More complex)</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="pages">Page Count</Label>
            <Select
              id="pages"
              value={pageCount}
              onChange={(e) => setPageCount(Number(e.target.value))}
              disabled={isLoading}
            >
              <option value={8}>8 pages</option>
              <option value={12}>12 pages</option>
              <option value={16}>16 pages</option>
              <option value={24}>24 pages</option>
            </Select>
          </FormGroup>
        </Row>

        {generationStore.error && (
          <ErrorMessage>{generationStore.error}</ErrorMessage>
        )}

        <Button type="submit" disabled={isLoading || !topic.trim()}>
          {isLoading ? 'Generating...' : 'Generate Outline'}
        </Button>
      </Form>
    </Container>
  );
});

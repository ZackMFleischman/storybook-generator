import { useState, useEffect } from 'react';
import styled from '@emotion/styled';

const Container = styled.div<{ hasFeedback: boolean; hasDirectEdit: boolean }>`
  position: relative;
  border: 2px solid ${props => {
    if (props.hasDirectEdit) return 'var(--primary-color)';
    if (props.hasFeedback) return 'var(--secondary-color)';
    return 'transparent';
  }};
  border-radius: var(--radius-md);
  transition: border-color 0.2s ease;

  &:hover .edit-button {
    opacity: 1;
  }
`;

const EditButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--text-secondary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;

  &:hover {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }
`;

const FeedbackBadge = styled.span<{ variant?: 'ai' | 'manual' }>`
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  background: ${props => props.variant === 'manual' ? 'var(--primary-color)' : 'var(--secondary-color)'};
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 999px;
`;

const EditInputContainer = styled.div<{ mode: 'ai' | 'manual' }>`
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: ${props => props.mode === 'manual' ? '#f0f9ff' : '#fffbeb'};
  border: 1px solid ${props => props.mode === 'manual' ? '#7dd3fc' : '#fcd34d'};
  border-radius: var(--radius-md);
`;

const ModeToggle = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
`;

const ModeButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.active ? 'var(--primary-color)' : 'var(--background-color)'};
  color: ${props => props.active ? 'white' : 'var(--text-secondary)'};

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FeedbackLabel = styled.label`
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
`;

const FeedbackTextarea = styled.textarea`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
`;

const ManualEditInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
`;

const ManualEditTextarea = styled.textarea`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
`;

const FeedbackActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  justify-content: flex-end;
`;

const SmallButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;

  background: ${props => props.variant === 'primary' ? 'var(--primary-color)' : 'transparent'};
  color: ${props => props.variant === 'primary' ? 'white' : 'var(--text-secondary)'};
  border: 1px solid ${props => props.variant === 'primary' ? 'var(--primary-color)' : 'var(--border-color)'};

  &:hover {
    opacity: 0.8;
  }
`;

const NoManualEditMessage = styled.p`
  color: var(--text-secondary);
  font-size: 0.8125rem;
  font-style: italic;
  margin: 0;
  padding: 0.5rem;
  text-align: center;
`;

type EditMode = 'ai' | 'manual';

interface EditableSectionProps {
  children: React.ReactNode;
  sectionLabel: string;
  feedback?: string;
  onFeedbackChange: (feedback: string) => void;
  // New props for direct editing
  editableContent?: string;
  onContentChange?: (content: string) => void;
  contentType?: 'text' | 'textarea';
}

export function EditableSection({
  children,
  sectionLabel,
  feedback,
  onFeedbackChange,
  editableContent,
  onContentChange,
  contentType = 'textarea',
}: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('manual');
  const [localFeedback, setLocalFeedback] = useState(feedback || '');
  const [localContent, setLocalContent] = useState(editableContent || '');

  // Track if there's a pending direct edit (content differs from original)
  const hasDirectEdit = editableContent !== undefined && localContent !== editableContent;
  const hasFeedback = !!feedback;
  const canManualEdit = editableContent !== undefined && onContentChange !== undefined;

  // Sync local content when editableContent prop changes
  useEffect(() => {
    if (editableContent !== undefined) {
      setLocalContent(editableContent);
    }
  }, [editableContent]);

  const handleSaveFeedback = () => {
    onFeedbackChange(localFeedback);
    setIsEditing(false);
  };

  const handleSaveContent = () => {
    if (onContentChange) {
      onContentChange(localContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalFeedback(feedback || '');
    setLocalContent(editableContent || '');
    setIsEditing(false);
  };

  const handleClearFeedback = () => {
    setLocalFeedback('');
    onFeedbackChange('');
    setIsEditing(false);
  };

  // Determine which badge to show
  const getBadge = () => {
    if (hasDirectEdit) {
      return <FeedbackBadge variant="manual">Modified</FeedbackBadge>;
    }
    if (hasFeedback) {
      return <FeedbackBadge variant="ai">AI edit pending</FeedbackBadge>;
    }
    return null;
  };

  return (
    <Container hasFeedback={hasFeedback} hasDirectEdit={hasDirectEdit}>
      {getBadge()}
      <EditButton className="edit-button" onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? 'Close' : 'Edit'}
      </EditButton>

      {children}

      {isEditing && (
        <EditInputContainer mode={editMode}>
          <ModeToggle>
            <ModeButton
              active={editMode === 'manual'}
              onClick={() => setEditMode('manual')}
              disabled={!canManualEdit}
              title={!canManualEdit ? 'Manual editing not available for this section' : undefined}
            >
              Manual Edit
            </ModeButton>
            <ModeButton
              active={editMode === 'ai'}
              onClick={() => setEditMode('ai')}
            >
              AI Suggestions
            </ModeButton>
          </ModeToggle>

          {editMode === 'manual' ? (
            canManualEdit ? (
              <>
                <FeedbackLabel>Edit {sectionLabel}</FeedbackLabel>
                {contentType === 'text' ? (
                  <ManualEditInput
                    type="text"
                    value={localContent}
                    onChange={(e) => setLocalContent(e.target.value)}
                    placeholder={`Enter new ${sectionLabel.toLowerCase()}...`}
                  />
                ) : (
                  <ManualEditTextarea
                    value={localContent}
                    onChange={(e) => setLocalContent(e.target.value)}
                    placeholder={`Enter new ${sectionLabel.toLowerCase()}...`}
                  />
                )}
                <FeedbackActions>
                  <SmallButton onClick={handleCancel}>Cancel</SmallButton>
                  <SmallButton variant="primary" onClick={handleSaveContent}>
                    Save Changes
                  </SmallButton>
                </FeedbackActions>
              </>
            ) : (
              <>
                <NoManualEditMessage>
                  Manual editing is not available for this section. Use AI Suggestions instead.
                </NoManualEditMessage>
                <FeedbackActions>
                  <SmallButton onClick={handleCancel}>Cancel</SmallButton>
                </FeedbackActions>
              </>
            )
          ) : (
            <>
              <FeedbackLabel>AI Suggestions for {sectionLabel}</FeedbackLabel>
              <FeedbackTextarea
                value={localFeedback}
                onChange={(e) => setLocalFeedback(e.target.value)}
                placeholder={`Describe what you'd like the AI to change about this ${sectionLabel.toLowerCase()}...`}
              />
              <FeedbackActions>
                {hasFeedback && (
                  <SmallButton onClick={handleClearFeedback}>Clear</SmallButton>
                )}
                <SmallButton onClick={handleCancel}>Cancel</SmallButton>
                <SmallButton variant="primary" onClick={handleSaveFeedback}>
                  Save Feedback
                </SmallButton>
              </FeedbackActions>
            </>
          )}
        </EditInputContainer>
      )}
    </Container>
  );
}

/**
 * Tag Input Component
 * Allows users to add and remove tags
 */

import { useState, KeyboardEvent } from 'react';
import styles from './TagInput.module.css';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

function TagInput({ tags, onChange, disabled = false, placeholder = 'Type and press Enter to add a tag' }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (!tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      onChange(tags.slice(0, -1));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={styles.root}>
      <div className={styles.tags} data-tag-input-tags>
        {tags.map((tag, index) => (
          <span key={index} className={styles.tagBadge}>
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className={styles.tagRemove}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={tags.length === 0 ? placeholder : ''}
          className={styles.field}
        />
      </div>
      <p className={styles.hint}>Press Enter to add a tag</p>
    </div>
  );
}

export default TagInput;

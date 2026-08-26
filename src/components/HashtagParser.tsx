import React from 'react';
import { FormattedText } from './FormattedText';

interface HashtagTextProps {
  text: string;
  onTagClick?: (tag: string) => void;
  className?: string;
  tagClassName?: string;
}

export const HashtagText: React.FC<HashtagTextProps> = ({
  text,
  onTagClick,
  className = '',
  tagClassName = '',
}) => {
  return (
    <FormattedText
      text={text}
      onTagClick={onTagClick}
      className={className}
      tagClassName={tagClassName}
    />
  );
};

export { FormattedText };


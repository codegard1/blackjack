// React
import React from 'react';

// Local Resources
import { useSettingContext } from '../context';
import { cardBackClassNames, cardBackColorPresets, cardBackColorVariables, cardBackPatternPresets } from '../theme';
import { CardBackColor, CardBackPattern } from '../types';
import './CardContainer.css';

export interface ICardBackPreviewProps {
  /** defaults to the card back pattern setting */
  pattern?: CardBackPattern;
  /** defaults to the card back color setting */
  color?: CardBackColor;
  /** card height in pixels */
  height?: number;
}

/**
 * A face-down card drawn with the same classes as a card on the table, so the
 * options panel shows exactly what a pattern and color look like together.
 */
export const CardBackPreview: React.FC<ICardBackPreviewProps> = ({ pattern, color, height = 96 }) => {
  const { settings } = useSettingContext();
  const backPattern = pattern ?? settings.cardBackPattern;
  const backColor = color ?? settings.cardBackColor;
  const patternLabel = cardBackPatternPresets[backPattern]?.label ?? backPattern;
  const colorLabel = cardBackColorPresets[backColor]?.label ?? backColor;

  return (
    <span
      role="img"
      aria-label={`Card back preview: ${patternLabel}, ${colorLabel}`}
      className={['playing-card', 'is-preview', ...cardBackClassNames(backPattern)].join(' ')}
      style={{
        '--playing-card-height': `${height}px`,
        height,
        width: Math.round(height * 0.65),
        ...cardBackColorVariables(backColor),
      } as React.CSSProperties}
    />
  );
}

import { CardStyle, cardStyles } from '../types';

export interface CardStylePreset {
  key: CardStyle;
  label: string;
  description: string;
}

/** Playing card face layouts, drawn by the is-style-* classes in CardContainer.css */
export const cardStylePresets: Record<CardStyle, CardStylePreset> = {
  classic: { key: 'classic', label: 'Classic', description: 'A framed face with corner indices' },
  minimal: { key: 'minimal', label: 'Minimal', description: 'Corner indices only, no frame' },
  bold: { key: 'bold', label: 'Bold', description: 'A large index and suit in the middle' },
};

/** The presets in option order */
export const cardStyleList = cardStyles.map((key) => cardStylePresets[key]);

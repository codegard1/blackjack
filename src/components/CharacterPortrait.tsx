import React from 'react';

import { Avatar, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

import { getCharacter } from '../characters';

/** Portraits are 24x24 pixel art, so every size is a whole multiple to keep pixels square */
export const PORTRAIT_SIZES = { sm: 24, md: 48, lg: 144 } as const;
export type PortraitSize = keyof typeof PORTRAIT_SIZES;

const useStyles = makeStyles({
  portrait: {
    display: 'block',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusMedium,
    imageRendering: 'pixelated',
  },
  large: {
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow8,
  },
});

interface ICharacterPortraitProps {
  /** a character id; anything else (a human player) shows initials */
  id: string;
  /** shown as initials when there is no portrait */
  name: string;
  size?: PortraitSize;
  /** decorative portraits sit next to the name, so they need no alt text */
  decorative?: boolean;
  className?: string;
}

/**
 * A computer character's pixel portrait, or a human player's initials
 */
export const CharacterPortrait: React.FC<ICharacterPortraitProps> = ({ id, name, size = 'md', decorative = false, className }) => {
  const styles = useStyles();
  const character = getCharacter(id);
  const px = PORTRAIT_SIZES[size];

  if (!character) {
    return <Avatar name={name} color="brand" size={px === 144 ? 128 : px === 48 ? 48 : 24} aria-hidden={decorative || undefined} className={className} />;
  }

  return (
    <img
      src={character.portrait}
      width={px}
      height={px}
      alt={decorative ? '' : character.portraitAlt}
      className={mergeClasses(styles.portrait, size === 'lg' && styles.large, className)}
    />
  );
};

import React from 'react';

import { Avatar, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

import { getCharacter } from '../game/characters';
import { SettingContext } from '../game/SettingContext';
import { hasPortraitAnimations } from './portraitAnimation';
import { usePortraitAnimation } from './usePortraitAnimation';

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
  animatedFrame: {
    position: 'relative',
    overflow: 'hidden',
  },
  baseImage: {
    display: 'block',
    width: '100%',
    height: '100%',
    imageRendering: 'pixelated',
  },
  canvasOverlay: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    display: 'block',
    imageRendering: 'pixelated',
    pointerEvents: 'none',
    opacity: 0,
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
  /** explicitly enable or disable portrait animations; defaults to settings.isAnimationsEnabled */
  animated?: boolean;
}

/**
 * A computer character's pixel portrait, or a human player's initials
 */
export const CharacterPortrait: React.FC<ICharacterPortraitProps> = React.memo(({
  id,
  name,
  size = 'md',
  decorative = false,
  className,
  animated: animatedProp,
}) => {
  const styles = useStyles();
  const character = getCharacter(id);
  const px = PORTRAIT_SIZES[size];
  const settings = React.useContext(SettingContext);
  const animationsEnabled = animatedProp ?? settings?.isAnimationsEnabled ?? true;
  const animated = animationsEnabled && hasPortraitAnimations(character?.id);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  usePortraitAnimation(animated ? character?.id : undefined, canvasRef);

  if (!character) {
    return <Avatar name={name} color="brand" size={px === 144 ? 128 : px === 48 ? 48 : 24} aria-hidden={decorative || undefined} className={className} />;
  }

  if (!animated) {
    return (
      <img
        src={character.portrait}
        width={px}
        height={px}
        alt={decorative ? '' : character.portraitAlt}
        className={mergeClasses(styles.portrait, size === 'lg' && styles.large, className)}
      />
    );
  }

  return (
    <span
      className={mergeClasses(styles.portrait, styles.animatedFrame, size === 'lg' && styles.large, className)}
      style={{ width: px, height: px }}
    >
      <img
        src={character.portrait}
        width={px}
        height={px}
        alt={decorative ? '' : character.portraitAlt}
        className={styles.baseImage}
      />
      <canvas
        ref={canvasRef}
        width={24}
        height={24}
        aria-hidden="true"
        className={styles.canvasOverlay}
      />
    </span>
  );
});

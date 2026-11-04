// React
import React from "react";

import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { Copy24Regular, Diamond24Filled, Heart24Filled } from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    position: 'relative',
    display: 'inline-block',
    flexShrink: 0,
  },
  cards: {
    display: 'block',
    width: '100%',
    height: '100%',
    color: tokens.colorBrandForeground1,
  },
  heart: {
    position: 'absolute',
    // centred on the front (upper-right, complete) card of the Copy glyph
    left: '48%',
    top: '22%',
    width: '36%',
    height: '36%',
    color: tokens.colorPaletteRedForeground1,
  },
  diamond: {
    position: 'absolute',
    // in the exposed lower-left corner of the back card
    left: '16%',
    top: '54%',
    width: '19%',
    height: '19%',
    color: tokens.colorPaletteRedForeground1,
  },
});

export interface IAppLogoProps {
  /** rendered size in pixels (square) */
  size?: number;
  className?: string;
}

/**
 * App logo: the Fluent "copy" glyph as two playing cards, with a heart
 * on the front card and a diamond peeking out from the card behind it.
 */
export const AppLogo: React.FC<IAppLogoProps> = ({ size = 28, className }) => {
  const styles = useStyles();
  return (
    <span className={mergeClasses(styles.root, className)} style={{ width: size, height: size }} aria-hidden="true">
      <Copy24Regular className={styles.cards} />
      <Diamond24Filled className={styles.diamond} />
      <Heart24Filled className={styles.heart} />
    </span>
  );
}

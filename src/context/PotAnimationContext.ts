import { createContext, useContext } from 'react';

/**
 * True while the pot or the dealer's hole card is animating, or the results of a round are being
 * announced; game controls wait for it to finish
 */
export const PotAnimationContext = createContext<boolean>(false);

/** Read whether the pot or the hole card is still animating */
export const usePotAnimation = () => useContext(PotAnimationContext);

import { createContext, useContext } from 'react';

/** True while the pot is animating; game controls wait for it to finish */
export const PotAnimationContext = createContext<boolean>(false);

/** Read whether the pot is still animating */
export const usePotAnimation = () => useContext(PotAnimationContext);

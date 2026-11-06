import { createContext, useContext } from 'react';

/** True while the pot's bounce is playing; game controls wait for it to finish */
export const PotAnimationContext = createContext<boolean>(false);

/** Read whether the pot's bounce is still playing */
export const usePotAnimation = () => useContext(PotAnimationContext);

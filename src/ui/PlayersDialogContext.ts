import { createContext, useContext } from 'react';

/**
 * Lets any component open the Players dialog, which App renders once
 */
export const PlayersDialogContext = createContext<() => void>(() => { });

export const usePlayersDialog = () => useContext(PlayersDialogContext);

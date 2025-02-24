import { StoreName } from "../enums";

/**
 * delete all entries from stores
*/
export function clearStores() {
  localStorage.removeItem(StoreName.DECKSTORE);
  localStorage.removeItem(StoreName.PLAYERSTORE);
  localStorage.removeItem(StoreName.SETTINGSTORE);
  localStorage.removeItem(StoreName.STATSTORE);
};

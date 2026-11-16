export enum StoreName {
  DECKSTORE = 'DECKSTORE',
  PLAYERSTORE = 'PLAYERSTORE',
  STATSTORE = 'STATSTORE',
  SETTINGSTORE = 'SETTINGSTORE',
  GAMESTORE = 'GAMESTORE',
  PROFILESTORE = 'PROFILESTORE',
  /** this browser's owner id and last sync time; survives Clear application data */
  SYNCSTORE = 'SYNCSTORE',
  /** the characters' stats summed across every table, as the server last sent them */
  COMMUNITYSTORE = 'COMMUNITYSTORE',
}


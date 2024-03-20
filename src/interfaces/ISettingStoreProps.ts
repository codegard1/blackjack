import React from 'react';

export interface ISettingStoreProps {
  isActivityLogVisible: boolean;
  isCardDescVisible: boolean;
  isCardTitleVisible: boolean;
  isDealerHandVisible: boolean;
  isDeckVisible: boolean;
  isDrawnVisible: boolean;
  isHandValueVisible: boolean;
  isMessageBarVisible: boolean;
  isOptionsPanelVisible: boolean;
  isSelectedVisible: boolean;
  isSplashScreenVisible: boolean;
  setActivityLogVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setCardDescVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setCardTitleVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setDealerHandVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setDeckVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setDrawnVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setHandValueVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setMessageBarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setOptionsPanelVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setSplashScreenVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

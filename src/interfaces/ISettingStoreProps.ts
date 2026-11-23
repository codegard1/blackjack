import React from 'react';

export interface ISettingStoreState {
  isActivityLogVisible: boolean;
  isCardDescVisible: boolean;
  isDealerHandVisible: boolean;
  isHandValueVisible: boolean;
  isOptionsPanelVisible: boolean;
}

export interface ISettingStoreProps extends ISettingStoreState {
  setActivityLogVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setCardDescVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setDealerHandVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setHandValueVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setOptionsPanelVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

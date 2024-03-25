
export interface IControlPanelStore {
  state: {
    isActivityLogVisible: boolean;
    isCardDescVisible: boolean;
    isDealerHandVisible: boolean;
    isDeckVisible: boolean;
    isDrawnVisible: boolean;
    isHandValueVisible: boolean;
    isSelectedVisible: boolean;
  };
  saveAll: () => void;
  initialize: () => void;
}

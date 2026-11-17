import { VisibleToast } from '../types';

export interface ITableToastsProps {
  /** oldest first; the newest line is at the bottom, beside the dock */
  toasts: VisibleToast[];
  /** where the feed sits: above the middle of the dock (the default), or over the pot at the dock's start */
  placement?: 'table' | 'pot';
  /** true to show every line at full strength, as for a list that is not a sequence; older lines are dimmer otherwise */
  isFlat?: boolean;
}

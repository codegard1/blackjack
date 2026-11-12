import { VisibleToast } from '../types';

export interface ITableToastsProps {
  /** oldest first; the newest line is at the bottom, beside the dock */
  toasts: VisibleToast[];
}

import { ToastItem } from '../types';

export interface ITableToastsProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

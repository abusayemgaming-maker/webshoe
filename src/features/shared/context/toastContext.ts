import * as React from 'react';
import { type ToastTone } from '../ui/Toast';

export interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

export const ToastContext = React.createContext<ToastContextValue | null>(null);

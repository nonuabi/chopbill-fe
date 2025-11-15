import { Slot } from 'expo-router';
import { ToastProvider } from './contexts/ToastContext';

export default function RootLayout() {
  return (
    <ToastProvider>
      <Slot />
    </ToastProvider>
  );
}
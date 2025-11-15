import { Slot } from 'expo-router';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Slot />
      </ToastProvider>
    </ThemeProvider>
  );
}
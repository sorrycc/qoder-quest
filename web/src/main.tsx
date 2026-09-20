import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import './index.css';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

// No StrictMode: its double-mount would spawn and kill a qodercli per visit in dev.
createRoot(document.getElementById('root')!).render(<App />);

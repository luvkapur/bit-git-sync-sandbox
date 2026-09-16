import { createRoot } from 'react-dom/client';
import { SkyUi } from './sky-ui.js';
import './sky-ui.css';
if (import.meta.hot) { import.meta.hot.accept(); }
createRoot(document.getElementById('root')!).render(<SkyUi />);

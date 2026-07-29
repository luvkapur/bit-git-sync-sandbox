import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { NebulaDesign } from './nebula-design.js';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { AppTheme } from './app-theme.js';

if (import.meta.hot) {
  import.meta.hot.accept();
}

/**
 * mounting for client side rendering.
 */
const container = document.getElementById('root');
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(container!);

root.render(
  <BrowserRouter>
    <AppTheme>
      <NebulaDesign />
    </AppTheme>
  </BrowserRouter>
);

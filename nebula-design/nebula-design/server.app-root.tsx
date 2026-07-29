import ReactDOMServer from 'react-dom/server';
// eslint-disable-next-line import/extensions
import { StaticRouter } from 'react-router-dom/server.js';
import { NebulaDesign } from './nebula-design.js';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { AppTheme } from './app-theme.js';

interface IRenderProps {
  path: string;
}

export const render = async ({ path }: IRenderProps) => {
  return ReactDOMServer.renderToString(
    <StaticRouter location={path}>
      {/* <NebulaTheme initialTheme="light"> */}
      <AppTheme>
        <NebulaDesign />
      </AppTheme>
      {/* </NebulaTheme> */}
    </StaticRouter>
  );
};

/**
 * implement loadScripts() to inject scripts to the head
 * during SSR.
 */
// export const loadScripts = async () => {
//   return '<script></script>';
// }

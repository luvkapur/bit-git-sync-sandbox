import ReactDOMServer from 'react-dom/server';
import { SkyUi } from './sky-ui.js';
export const render = async () => ReactDOMServer.renderToString(<SkyUi />);

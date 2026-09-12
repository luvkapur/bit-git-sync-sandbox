import { NodeServer } from '@bitdev/node.node-server';

export default NodeServer.from({
  name: 'sky-api',
  mainPath: import.meta.resolve('./sky-api.app-root.js'),
});

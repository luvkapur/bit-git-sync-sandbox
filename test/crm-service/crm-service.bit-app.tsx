import { NodeServer } from '@bitdev/node.node-server';

export default NodeServer.from({
  name: 'crm-service',
  mainPath: import.meta.resolve('./crm-service.app-root.js'),
});

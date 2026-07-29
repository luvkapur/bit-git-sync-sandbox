import { syncProbe } from './sync-probe.js';

it('renders with the correct text', () => {
  expect(syncProbe()).toEqual('hello world');
});

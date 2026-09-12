import { Platform } from '@bitdev/platforms.platform';

const PlatformGateway = import.meta.resolve('@bitdev/platforms.backend.gateway-server');
const Ui = import.meta.resolve('@luvktest/test.sky-ui');
const Api = import.meta.resolve('@luvktest/test.sky-api');

export const Skyline = Platform.from({
  name: 'skyline',
  frontends: { main: Ui, mainPortRange: [3200, 3300] },
  backends: { main: PlatformGateway, services: [Api] },
});

export default Skyline;

import { Platform } from '@bitdev/platforms.platform';

const PlatformGateway = import.meta.resolve('@bitdev/platforms.backend.gateway-server');
const CrmUi = import.meta.resolve('@luvktest/test.crm-ui');
const CrmService = import.meta.resolve('@luvktest/test.crm-service');

export const HopeCrm = Platform.from({
  name: 'hope-crm',
  frontends: {
    main: CrmUi,
    mainPortRange: [3000, 3100],
  },
  backends: {
    main: PlatformGateway,
    services: [ CrmService ],
  },
});

export default HopeCrm;

import { CrmService } from './crm-service.js';

describe('crm service', () => {
  it('should say hello', async () => {
    const crmService = CrmService.from();
    const greeting = await crmService.getHello();
    expect(greeting).toEqual('Hello World!');
  })
});
    
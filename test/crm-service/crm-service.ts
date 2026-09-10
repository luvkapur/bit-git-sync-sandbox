
/**
 * crm service
 */
export class CrmService {
  
  /**
   * say hello.
   */
  async getHello() {
    return 'Hello World!';
  }

  /**
   * create a new instance of a crm service.
   */
  static from() {
    return new CrmService();
  }
}

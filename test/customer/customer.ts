
export type PlainCustomer = {
  name: string;
}

export class Customer {
  constructor(
    /**
     * name of the instance
     */
    readonly name: string
  ) {}

  /**
   * serialize a Customer into
   * a serializable object.
   */
  toObject() {
    return {
      name: this.name
    };
  }

  /**
   * create a Customer object from a 
   * plain object.
   */
  static from(plainCustomer: PlainCustomer) {
    return new Customer(
      plainCustomer.name
    );
  }
}

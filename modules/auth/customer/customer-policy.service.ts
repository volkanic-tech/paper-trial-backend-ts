import { NotFoundError } from "../../common/error";
import { CustomerRepository } from "./customer.repository";

export class CustomerPolicyService {

    constructor(
        private readonly customerRepository: CustomerRepository
    ) { }

    assertCustomerExists = async (id: number) => {
        const customer = await this.customerRepository.findById(id);

        if (!customer) {
            throw new NotFoundError(`Customer with ID ${id} not found`);
        }

        return customer;
    }

    assertCustomerExistsByEmail = async (customerEmail: string) => {
        const customer = await this.customerRepository.findByEmail(customerEmail);

        if (!customer) {
            throw new NotFoundError(`Customer with email ${customerEmail} not found`);
        }

        return customer;
    }

}
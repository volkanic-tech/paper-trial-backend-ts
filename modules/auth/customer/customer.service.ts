import bcrypt from 'bcryptjs';
import { UnauthorizedError } from "../../common/error";
import { CustomerRepository } from "./customer.repository";
import { ChangeUserActiveStatusInput, CreateUserInput, ListUsersQueryInput, LoginUserSchemaInput, UpdateUserInput } from "./customer.schema";
import { JwtService } from '../../../utils/jwt.service';
import { CustomerPolicyService } from './customer-policy.service';

export class CustomerService {
    constructor(
        private readonly customerRepository: CustomerRepository,
        private readonly jwtService: JwtService,
        private readonly customerPolicyService: CustomerPolicyService
    ) { }

    register = async (data: CreateUserInput) => {
        const existingCustomer = await this.customerRepository.findByEmail(data.email);

        if (existingCustomer) {
            throw new UnauthorizedError(`Customer with email ${data.email} already exists`);
        }

        const phoneExists = await this.customerRepository.findByPhone(data.phone);

        if (phoneExists) {
            throw new UnauthorizedError(`Customer with phone ${data.phone} already exists`);
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const newCustomer = await this.customerRepository.create({
            ...data,
            password: hashedPassword
        });

        const token = this.jwtService.signCustomerToken(newCustomer);

        return {
            token,
            user: await this.customerRepository.findSafeById(newCustomer.id)
        };

    }

    login = async (data: LoginUserSchemaInput) => {

        const customer = await this.customerPolicyService.assertCustomerExistsByEmail(data.email);

        const isPasswordValid = await bcrypt.compare(data.password, customer.password);

        if (!isPasswordValid) {
            throw new UnauthorizedError(`Invalid credentials`);
        }

        if (!customer.isActive) {
            throw new UnauthorizedError(`Customer account is inactive`);
        }

        const token = this.jwtService.signCustomerToken(customer);

        return {
            token,
            user: await this.customerRepository.findSafeById(customer.id)
        };

    }

    me = async (customerId: number) => {
        return await this.customerRepository.findSafeById(customerId);
    }

    changeActiveStatus = async (input: ChangeUserActiveStatusInput) => {
        const customer = await this.customerPolicyService.assertCustomerExistsByEmail(input.email);

        if (!customer) {
            throw new UnauthorizedError(`Customer with email ${input.email} not found`);
        }

        return await this.customerRepository.changeActiveStatus(customer.id, input.isActive);
    }

    updateCustomerProfile = async (customerId: number, data: UpdateUserInput) => {

        const customer = await this.customerPolicyService.assertCustomerExists(customerId);

        if (!customer) {
            throw new UnauthorizedError(`Customer with ID ${customerId} not found`);
        }

        if (data.password) {
            const hashedPassword = await bcrypt.hash(data.password, 10);
            data.password = hashedPassword;
        }

        return await this.customerRepository.update(data, customerId);

    }

    listCustomers = async (query: ListUsersQueryInput) => {
        return await this.customerRepository.listAll(query);
    }

    getCustomerById = async (customerId: number) => {
        const customer = await this.customerPolicyService.assertCustomerExists(customerId);
        return customer;
    }

}
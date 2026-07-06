import bcrypt from 'bcryptjs';
import { UnauthorizedError } from "../../common/error";
import { CustomerRepository } from "./customer.repository";
import { CreateUserInput, LoginUserSchemaInput } from "./customer.schema";
import { JwtService } from '../../../utils/jwt.service';

export class CustomerService {
    constructor(
        private readonly customerRepository: CustomerRepository,
        private readonly jwtService: JwtService
    ) { }

    register = async (data: CreateUserInput) => {
        const existingCustomer = await this.customerRepository.findByEmail(data.email);

        if (existingCustomer) {
            throw new UnauthorizedError(`Customer with email ${data.email} already exists`);
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
        const customer = await this.customerRepository.findByEmail(data.email);

        if (!customer) {
            throw new UnauthorizedError(`Customer with email ${data.email} not found`);
        }

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

}
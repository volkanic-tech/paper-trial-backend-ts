import { Request, Response } from "express";
import { CustomerService } from "./customer.service";
import { loginSchema } from "../admin/auth.schemas";
import { handleError } from "../../../utils/error-handler";
import { AuthenticatedUserRequest } from "../../../types";
import { changeUserActiveStatusSchema, createUserSchema, listUsersQuerySchema } from "./customer.schema";

export class CustomerAuthController {
    constructor(
        private readonly customerService: CustomerService
    ) { }

    register = async (req: Request, res: Response) => {
        try {
            const input = createUserSchema.parse(req.body);
            const customer = await this.customerService.register(input);

            res.status(201).json({
                message: 'Customer registered successfully',
                data: { customer }
            });
        } catch (err) {
            handleError(err, res, 'Customer registration error:');
        }
    }

    login = async (req: Request, res: Response) => {
        try {
            const input = loginSchema.parse(req.body);
            const customer = await this.customerService.login(input);
            res.json({
                message: 'Customer login successful',
                data: { customer }
            });
        } catch (err) {
            handleError(err, res, 'Customer login error:');
        }
    }

    me = async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const customerId = req.user?.id;
            if (!customerId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const customer = await this.customerService.getCustomerById(customerId);
            if (!customer) {
                return res.status(404).json({ message: 'Customer not found' });
            }

            res.json({
                message: 'Customer retrieved successfully',
                data: { customer }
            });

        } catch (err) {
            handleError(err, res, 'Get customer error:');
        }

    }

    listCustomers = async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const input = listUsersQuerySchema.parse(req.query);
            const customers = await this.customerService.listCustomers(input);
            res.json({
                message: 'Customers retrieved successfully',
                data: { customers }
            });
        } catch (err) {
            handleError(err, res, 'List customers error:');
        }
    }

    changeActiveStatus = async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const input = changeUserActiveStatusSchema.parse(req.body);
            const customer = await this.customerService.changeActiveStatus(input);
            res.json({
                message: `Customer account ${customer.isActive ? 'activated' : 'deactivated'} successfully`,
                data: { customer }
            });
        } catch (err) {
            handleError(err, res, 'Change customer active status error:');
        }

    }

}
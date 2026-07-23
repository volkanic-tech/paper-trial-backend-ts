import { Response } from 'express';
import { CustomerRequest } from '../../middlewares/customer.middleware';
import { AuthenticatedAdminRequest } from '../../types';
import { handleError } from '../../utils/error-handler';
import {
    createCustomerOrderSchema,
    createOrderSchema,
    listOrdersQuerySchema,
    updateOrderSchema,
    updateOrderStatusSchema,
    updatePaymentStatusSchema
} from './order.schemas';
import { OrderService } from './order.service';

export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    create = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = createOrderSchema.parse(req.body);
            const order = await this.orderService.createOrder(input);

            res.status(201).json({
                message: 'Order created successfully',
                data: { order }
            });
        } catch (error) {
            handleError(error, res, 'Order creation error:');
        }
    };

    createCustomerOrder = async (req: CustomerRequest, res: Response) => {
        try {
            const input = createCustomerOrderSchema.parse(req.body);
            const order = await this.orderService.createCustomerOrder(req.user!.id, input);

            res.status(201).json({
                message: 'Order created successfully',
                data: { order }
            });
        } catch (error) {
            handleError(error, res, 'Customer order creation error:');
        }
    };

    list = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = listOrdersQuerySchema.parse(req.query);
            const data = await this.orderService.listOrders(input);

            res.json({
                message: 'Orders retrieved successfully',
                data
            });
        } catch (error) {
            handleError(error, res, 'Get orders error:');
        }
    };

    getById = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const order = await this.orderService.getOrderById(Number(req.params.id));

            res.json({
                message: 'Order retrieved successfully',
                data: { order }
            });
        } catch (error) {
            handleError(error, res, 'Get order by ID error:');
        }
    };

    getByUUID = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const order = await this.orderService.getOrderByUUID(req.params.uuid);

            res.json({
                message: 'Order retrieved successfully',
                data: { order }
            });
        } catch (error) {
            handleError(error, res, 'Get order by UUID error:');
        }
    };

    getByUserId = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const orders = await this.orderService.getOrdersByUserId(Number(req.params.userId));

            res.json({
                message: 'User orders retrieved successfully',
                data: { orders }
            });
        } catch (error) {
            handleError(error, res, 'Get user orders error:');
        }
    };

    update = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = updateOrderSchema.parse(req.body);
            const order = await this.orderService.updateOrder(Number(req.params.id), input);

            res.json({
                message: 'Order updated successfully',
                data: { order }
            });
        } catch (error) {
            handleError(error, res, 'Order update error:');
        }
    };

    updateStatus = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const { status } = updateOrderStatusSchema.parse(req.body);
            const order = await this.orderService.updateStatus(Number(req.params.id), status);

            res.json({
                message: 'Order status updated successfully',
                data: { order }
            });
        } catch (error) {
            handleError(error, res, 'Order status update error:');
        }
    };

    updatePaymentStatus = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const { paymentStatus } = updatePaymentStatusSchema.parse(req.body);
            const order = await this.orderService.updatePaymentStatus(Number(req.params.id), paymentStatus);

            res.json({
                message: 'Order payment status updated successfully',
                data: { order }
            });
        } catch (error) {
            handleError(error, res, 'Order payment status update error:');
        }
    };

    stats = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const stats = await this.orderService.getStats();

            res.json({
                message: 'Order statistics retrieved successfully',
                data: { stats }
            });
        } catch (error) {
            handleError(error, res, 'Get order statistics error:');
        }
    };

    dispatchOrder = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = createOrderSchema.parse(req.body);
            const order = await this.orderService.dispatchOrder(input);

            res.status(201).json({
                message: 'Order dispatched successfully',
                data: { order }
            });
        } catch (error) {
            handleError(error, res, 'Dispatch order error:');
        }
    }

}

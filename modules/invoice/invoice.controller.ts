import { Response } from 'express';
import { AuthenticatedAdminRequest } from '../../types';
import { handleError } from '../../utils/error-handler';
import {
    createInvoiceSchema,
    listInvoicesQuerySchema,
    updateInvoiceSchema,
    updateInvoiceStatusSchema
} from './invoice.schemas';
import { QuotationInvoiceService } from './invoice.service';

export class InvoiceController {
    constructor(private readonly invoiceService: QuotationInvoiceService) {}

    createInvoice = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = createInvoiceSchema.parse(req.body);
            const document = await this.invoiceService.createInvoice(input);

            res.status(201).json({
                message: `${document.type === 'quotation' ? 'Quotation' : 'Invoice'} created successfully`,
                data: { document }
            });
        } catch (error) {
            handleError(error, res, 'Invoice creation error:');
        }
    };

    updateInvoice = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = updateInvoiceSchema.parse(req.body);
            const document = await this.invoiceService.updateInvoice(Number(req.params.id), input);

            res.json({
                message: 'Document updated successfully',
                data: { document }
            });
        } catch (error) {
            handleError(error, res, 'Invoice update error:');
        }
    };

    updateStatus = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const { status } = updateInvoiceStatusSchema.parse(req.body);
            const document = await this.invoiceService.updateStatus(Number(req.params.id), status);

            res.json({
                message: 'Document status updated successfully',
                data: { document }
            });
        } catch (error) {
            handleError(error, res, 'Invoice status update error:');
        }
    };

    getInvoiceById = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const document = await this.invoiceService.getInvoiceById(Number(req.params.id));

            res.json({
                message: 'Document retrieved successfully',
                data: { document }
            });
        } catch (error) {
            handleError(error, res, 'Get invoice by ID error:');
        }
    };

    getInvoiceByNumber = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const document = await this.invoiceService.getInvoiceByGeneratedId(req.params.generatedId);

            res.json({
                message: 'Document retrieved successfully',
                data: { document }
            });
        } catch (error) {
            handleError(error, res, 'Get invoice by number error:');
        }
    };

    getAllInvoices = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const input = listInvoicesQuerySchema.parse(req.query);
            const data = await this.invoiceService.getInvoices(input);

            res.json({
                message: 'Documents retrieved successfully',
                data
            });
        } catch (error) {
            handleError(error, res, 'Get all invoices error:');
        }
    };

    getStats = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const stats = await this.invoiceService.getStats();

            res.json({
                message: 'Invoice statistics retrieved successfully',
                data: { stats }
            });
        } catch (error) {
            handleError(error, res, 'Get invoice statistics error:');
        }
    };

    convertQuotation = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const invoice = await this.invoiceService.convertQuotationToInvoice(Number(req.params.id));

            res.status(201).json({
                message: 'Quotation converted to invoice successfully',
                data: { invoice }
            });
        } catch (error) {
            handleError(error, res, 'Quotation conversion error:');
        }
    };

    deleteInvoice = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            await this.invoiceService.deleteInvoice(Number(req.params.id));

            res.json({
                message: 'Document deleted successfully',
                data: null
            });
        } catch (error) {
            handleError(error, res, 'Invoice deletion error:');
        }
    };
}

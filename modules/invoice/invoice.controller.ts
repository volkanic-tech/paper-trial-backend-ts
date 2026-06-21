import { AuthenticatedAdminRequest } from "../../types";
import { handleError } from "../../utils/error-handler";
import { QuotationInvoiceService } from "./invoice.service";
import { Response } from 'express';

export class InvoiceController {
    constructor(private readonly invoiceService: QuotationInvoiceService) { }

    createInvoice = async (req: AuthenticatedAdminRequest, res: Response) => {
        try {
            const invoice = await this.invoiceService.createInvoice(req.body);
            res.status(201).json({
                message: 'Invoice created successfully',
                data: { invoice }
            });
        } catch (error) {
            handleError(error, res, 'Invoice creation error:');
        }
    }
}
import express from 'express';
import adminAuthMiddleware from '../../middlewares/auth.middleware';
import { InvoiceController } from './invoice.controller';
import { InvoiceRepository } from './invoice.repository';
import { QuotationInvoiceService } from './invoice.service';

const router = express.Router();
const invoiceController = new InvoiceController(
    new QuotationInvoiceService(
        new InvoiceRepository()
    )
);

router.route('/')
    .post(adminAuthMiddleware('moderator'), invoiceController.createInvoice)
    .get(adminAuthMiddleware('moderator'), invoiceController.getAllInvoices);

router.route('/stats')
    .get(adminAuthMiddleware('moderator'), invoiceController.getStats);

router.route('/number/:generatedId')
    .get(adminAuthMiddleware('moderator'), invoiceController.getInvoiceByNumber);

router.route('/:id')
    .get(adminAuthMiddleware('moderator'), invoiceController.getInvoiceById)
    .patch(adminAuthMiddleware('moderator'), invoiceController.updateInvoice)
    .delete(adminAuthMiddleware('admin'), invoiceController.deleteInvoice);

router.route('/:id/status')
    .patch(adminAuthMiddleware('moderator'), invoiceController.updateStatus);

router.route('/:id/convert-to-invoice')
    .post(adminAuthMiddleware('moderator'), invoiceController.convertQuotation);

export default router;

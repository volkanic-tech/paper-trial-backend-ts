import { QuotationInvoice } from "../../generated/prisma/client";
import { BadRequestError, ConflictError } from "../common/error";
import { DocumentStatus, InvoiceItemInput } from "./invoice.schemas";

export class InvoicePolicyService {

    assertEditable(invoice: QuotationInvoice) {
        if (invoice.status === 'paid') {
            throw new ConflictError('Cannot update a paid invoice');
        }
    }

    assertStatusTransition(invoice: QuotationInvoice, nextStatus: DocumentStatus) {
        if (invoice.status === nextStatus) {
            return;
        }

        if (invoice.status === 'paid') {
            throw new ConflictError('A paid invoice cannot change status');
        }

        if (invoice.type === 'quotation' && nextStatus === 'paid') {
            throw new ConflictError('A quotation cannot be marked as paid');
        }

        const transitions: Record<string, DocumentStatus[]> = {
            draft: ['issued'],
            issued: invoice.type === 'invoice' ? ['paid', 'overdue'] : ['overdue'],
            overdue: invoice.type === 'invoice' ? ['paid', 'issued'] : ['issued']
        };

        if (!transitions[invoice.status]?.includes(nextStatus)) {
            throw new ConflictError(`Cannot change status from ${invoice.status} to ${nextStatus}`);
        }
    }

    assertValidDateRange(issueDate: Date, expiryDate: Date) {
        if (expiryDate < issueDate) {
            throw new BadRequestError('Expiry date cannot be before issue date');
        }
    }

    readItems(invoice: QuotationInvoice): InvoiceItemInput[] {
        if (!Array.isArray(invoice.items)) {
            throw new ConflictError('Stored invoice items are invalid');
        }

        return invoice.items as InvoiceItemInput[];
    }

    validateId(id: number) {
        if (!Number.isInteger(id) || id <= 0) {
            throw new BadRequestError('Invoice ID must be a positive integer');
        }
    }

}
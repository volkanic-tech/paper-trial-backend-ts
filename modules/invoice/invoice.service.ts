import { Prisma } from '../../generated/prisma/client';
import { ConflictError, NotFoundError } from '../common/error';
import { InvoiceCalculatorService } from './invoice-calculator.service';
import { InvoicePolicyService } from './invoice-policy.service';
import { InvoiceRepository } from './invoice.repository';
import {
    CreateInvoiceInput,
    DocumentStatus,
    ListInvoicesQueryInput,
    UpdateInvoiceInput
} from './invoice.schemas';


export class QuotationInvoiceService {
    constructor(
        private readonly invoiceRepository: InvoiceRepository,
        private readonly invoicePolicyService: InvoicePolicyService,
        private readonly invoiceCalculatorService: InvoiceCalculatorService
    ) { }

    async createInvoice(input: CreateInvoiceInput) {
        const totals = this.invoiceCalculatorService.calculateTotals(
            input.items,
            input.taxRate,
            input.shippingFee,
            input.discountRate
        );

        return this.invoiceRepository.create({
            ...input,
            ...totals,
            items: totals.items as unknown as Prisma.InputJsonValue
        });
    }

    async getInvoiceById(id: number) {
        this.invoicePolicyService.validateId(id);

        const invoice = await this.invoiceRepository.findById(id);

        if (!invoice) {
            throw new NotFoundError(`Invoice or quotation with ID ${id} not found`);
        }

        return invoice;
    }

    async getInvoiceByGeneratedId(generatedId: string) {
        const invoice = await this.invoiceRepository.findByGeneratedInvoiceNumber(generatedId);

        if (!invoice) {
            throw new NotFoundError(`Document ${generatedId} not found`);
        }

        return invoice;
    }

    async updateInvoice(id: number, input: UpdateInvoiceInput) {
        const invoice = await this.getInvoiceById(id);
        this.invoicePolicyService.assertEditable(invoice);

        if (input.status) {
            this.invoicePolicyService.assertStatusTransition(invoice, input.status);
        }

        const issueDate = input.issueDate || invoice.issueDate;
        const expiryDate = input.expiryDate || invoice.expiryDate;
        this.invoicePolicyService.assertValidDateRange(issueDate, expiryDate);

        const updateData: Prisma.QuotationInvoiceUpdateInput = {
            ...input,
            issueDate,
            expiryDate
        };

        const affectsTotals = input.items !== undefined
            || input.taxRate !== undefined
            || input.shippingFee !== undefined
            || input.discountRate !== undefined;

        if (affectsTotals) {
            const items = input.items || this.invoicePolicyService.readItems(invoice);
            const totals = this.invoiceCalculatorService.calculateTotals(
                items,
                input.taxRate ?? invoice.taxRate,
                input.shippingFee ?? invoice.shippingFee,
                input.discountRate ?? invoice.discountRate
            );

            Object.assign(updateData, {
                ...totals,
                items: totals.items as unknown as Prisma.InputJsonValue
            });
        }

        return this.invoiceRepository.update(id, updateData);
    }

    async updateStatus(id: number, status: DocumentStatus) {
        const invoice = await this.getInvoiceById(id);
        this.invoicePolicyService.assertStatusTransition(invoice, status);

        return this.invoiceRepository.update(id, { status });
    }

    async getInvoices(input: ListInvoicesQueryInput) {
        const { documents, totalCount } = await this.invoiceRepository.list(input);
        const totalPages = Math.ceil(totalCount / input.limit);

        return {
            documents,
            pagination: {
                currentPage: input.page,
                totalPages,
                totalCount,
                limit: input.limit,
                hasNextPage: input.page < totalPages,
                hasPreviousPage: input.page > 1
            }
        };
    }

    getStats() {
        return this.invoiceRepository.getStats();
    }

    async convertQuotationToInvoice(id: number) {
        const quotation = await this.getInvoiceById(id);

        if (quotation.type !== 'quotation') {
            throw new ConflictError('Only quotations can be converted to invoices');
        }

        if (quotation.status === 'draft') {
            throw new ConflictError('Issue the quotation before converting it to an invoice');
        }

        const items = this.invoicePolicyService.readItems(quotation);
        const issueDate = new Date();
        const expiryDate = quotation.expiryDate > issueDate
            ? quotation.expiryDate
            : new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        return this.invoiceRepository.create({
            type: 'invoice',
            customerId: quotation.customerId,
            customerName: quotation.customerName,
            customerEmail: quotation.customerEmail,
            customerPhone: quotation.customerPhone,
            customerAddress: quotation.customerAddress,
            issueDate,
            expiryDate,
            items: items as unknown as Prisma.InputJsonValue,
            subtotal: quotation.subtotal,
            taxRate: quotation.taxRate,
            taxAmount: quotation.taxAmount,
            shippingFee: quotation.shippingFee,
            discountRate: quotation.discountRate,
            discountAmount: quotation.discountAmount,
            total: quotation.total,
            status: 'draft',
            notes: quotation.notes
                ? `${quotation.notes}\nConverted from ${quotation.generatedId}`
                : `Converted from ${quotation.generatedId}`
        });
    }

    async deleteInvoice(id: number) {
        const invoice = await this.getInvoiceById(id);

        if (invoice.status === 'paid') {
            throw new ConflictError('Cannot delete a paid invoice');
        }

        return this.invoiceRepository.delete(id);
    }

}

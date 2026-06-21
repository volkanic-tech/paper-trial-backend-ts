import prisma from '../../config/prisma';
import { Prisma } from '../../generated/prisma/client';

export class InvoiceRepository {

    findById(id: number) {
        return prisma.quotationInvoice.findUnique({
            where: { id },
        });
    }

    findByGeneratedInvoiceNumber(invoiceNumber: string) {
        return prisma.quotationInvoice.findUnique({
            where: { generatedId: invoiceNumber },
        });
    }

    async create(data: Prisma.QuotationInvoiceCreateInput) {
        const invoice = await prisma.quotationInvoice.create({
            data,
        });

        const invoiceId = `INV-${new Date().getFullYear().toString().slice(-2)}-${invoice.id.toString().padStart(4, '0')}`;

        await prisma.quotationInvoice.update({
            where: { id: invoice.id },
            data: { generatedId: invoiceId },
        });

        return invoice;
    }

    update(id: number, data: Prisma.QuotationInvoiceUpdateInput) {
        return prisma.quotationInvoice.update({
            where: { id },
            data,
        });
    }

    delete(id: number) {
        return prisma.quotationInvoice.delete({
            where: { id },
        });
    }

    list(
        where: Prisma.QuotationInvoiceWhereInput,
        skip: number,
        take: number,
        orderBy: Prisma.QuotationInvoiceOrderByWithRelationInput
    ) {
        return prisma.quotationInvoice.findMany({
            where,
            skip,
            take,
            orderBy,
        });
    }

    count(where: Prisma.QuotationInvoiceWhereInput) {
        return prisma.quotationInvoice.count({ where });
    }

}
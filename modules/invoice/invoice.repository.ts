import { randomUUID } from 'node:crypto';
import prisma from '../../config/prisma';
import { Prisma } from '../../generated/prisma/client';
import { DocumentType, ListInvoicesQueryInput } from './invoice.schemas';

type InvoiceTransactionClient = Pick<typeof prisma, 'quotationInvoice'>;

export class InvoiceRepository {
    findById(id: number) {
        return prisma.quotationInvoice.findUnique({
            where: { id }
        });
    }

    findByGeneratedInvoiceNumber(generatedId: string) {
        return prisma.quotationInvoice.findUnique({
            where: { generatedId }
        });
    }

    create(data: Omit<Prisma.QuotationInvoiceCreateInput, 'generatedId'> & { type: DocumentType }) {
        return prisma.$transaction(async transaction => {
            const invoiceTransaction = transaction as InvoiceTransactionClient;
            const document = await invoiceTransaction.quotationInvoice.create({
                data: {
                    ...data,
                    generatedId: `TEMP-${randomUUID()}`
                }
            });

            const generatedId = this.generateDocumentNumber(data.type, document.id, document.issueDate);

            return invoiceTransaction.quotationInvoice.update({
                where: { id: document.id },
                data: { generatedId }
            });
        });
    }

    update(id: number, data: Prisma.QuotationInvoiceUpdateInput) {
        return prisma.quotationInvoice.update({
            where: { id },
            data
        });
    }

    delete(id: number) {
        return prisma.quotationInvoice.delete({
            where: { id }
        });
    }

    async list(input: ListInvoicesQueryInput) {
        const where: Prisma.QuotationInvoiceWhereInput = {
            type: input.type,
            status: input.status
        };

        if (input.search) {
            where.OR = [
                { generatedId: { contains: input.search, mode: 'insensitive' } },
                { customerName: { contains: input.search, mode: 'insensitive' } },
                { customerEmail: { contains: input.search, mode: 'insensitive' } },
                { customerPhone: { contains: input.search, mode: 'insensitive' } }
            ];
        }

        const [documents, totalCount] = await prisma.$transaction([
            prisma.quotationInvoice.findMany({
                where,
                orderBy: {
                    [input.sortBy]: input.sortOrder
                },
                skip: (input.page - 1) * input.limit,
                take: input.limit
            }),
            prisma.quotationInvoice.count({ where })
        ]);

        return { documents, totalCount };
    }

    async getStats() {
        const [total, quotations, invoices, paid, overdue, totalRevenue] = await prisma.$transaction([
            prisma.quotationInvoice.count(),
            prisma.quotationInvoice.count({ where: { type: 'quotation' } }),
            prisma.quotationInvoice.count({ where: { type: 'invoice' } }),
            prisma.quotationInvoice.count({ where: { type: 'invoice', status: 'paid' } }),
            prisma.quotationInvoice.count({ where: { type: 'invoice', status: 'overdue' } }),
            prisma.quotationInvoice.aggregate({
                where: { type: 'invoice', status: 'paid' },
                _sum: { total: true }
            })
        ]);

        return {
            total,
            quotations,
            invoices,
            paid,
            overdue,
            totalRevenue: totalRevenue._sum.total || 0
        };
    }

    private generateDocumentNumber(type: DocumentType, id: number, issueDate: Date) {
        const prefix = type === 'quotation' ? 'QUO' : 'INV';
        const year = issueDate.getFullYear().toString().slice(-2);
        return `${prefix}-${year}-${id.toString().padStart(4, '0')}`;
    }
}

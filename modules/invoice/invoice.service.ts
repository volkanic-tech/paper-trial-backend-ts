import { QuotationInvoiceCreateInput } from "../../generated/prisma/models";
import { InvoiceRepository } from "./invoice.repository";

export class QuotationInvoiceService {
    constructor(private readonly invoiceRepository: InvoiceRepository) { }

    async createInvoice(data: QuotationInvoiceCreateInput) {
        const generatedId = `INV-${new Date().getFullYear()}`;
        return this.invoiceRepository.create({ ...data, generatedId: generatedId });
    }

    async getInvoiceById(id: number) {
        return this.invoiceRepository.findById(id);
    }

    async getInvoiceByGeneratedId(generatedId: string) {
        return this.invoiceRepository.findByGeneratedInvoiceNumber(generatedId);
    }

    async updateInvoice(id: number, data: Partial<QuotationInvoiceCreateInput>) {
        return this.invoiceRepository.update(id, data);
    }

}
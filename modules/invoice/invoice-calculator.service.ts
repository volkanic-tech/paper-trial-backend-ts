import { InvoiceItemInput } from "./invoice.schemas";

export type CalculatedItem = {
    id: number;
    name: string;
    basePrice: number;
    price: number;
    quantity: number;
    subtotal: number;
};


export class InvoiceCalculatorService {

    calculateTotals(
        items: InvoiceItemInput[],
        taxRate: number,
        shippingFee: number,
        discountRate: number
    ) {
        const calculatedItems: CalculatedItem[] = items.map(item => ({
            id: item.id,
            name: item.name,
            basePrice: this.roundMoney(item.basePrice ?? item.price),
            price: this.roundMoney(item.price),
            quantity: item.quantity,
            subtotal: this.roundMoney(item.price * item.quantity)
        }));

        const subtotal = this.roundMoney(
            calculatedItems.reduce((sum, item) => sum + item.subtotal, 0)
        );
        const discountAmount = this.roundMoney(subtotal * (discountRate / 100));
        const taxableAmount = Math.max(0, subtotal - discountAmount);
        const taxAmount = this.roundMoney(taxableAmount * (taxRate / 100));
        const total = this.roundMoney(taxableAmount + taxAmount + shippingFee);

        return {
            items: calculatedItems,
            subtotal,
            taxRate,
            taxAmount,
            shippingFee: this.roundMoney(shippingFee),
            discountRate,
            discountAmount,
            total
        };
    }

    private roundMoney(value: number) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }
}
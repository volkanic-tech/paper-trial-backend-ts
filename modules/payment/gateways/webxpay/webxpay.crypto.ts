import NodeRSA from 'node-rsa';

export class WebxpayCrypto {
    constructor(private readonly publicKey: string) { }

    encryptPayment(value: string) {
        return this.createKey().encrypt(value, 'base64');
    }

    decodeGatewayPayment(value: string) {
        return Buffer.from(value, 'base64').toString('utf8');
    }

    verifyGatewaySignature(payment: string, signature: string) {
        const key = this.createKey();

        key.setOptions({ signingScheme: 'pss-sha1' });

        return key.verify(
            Buffer.from(payment, 'base64'),
            Buffer.from(signature, 'base64')
        );
    }

    encodeCustomFields(values: string[]) {
        return Buffer.from(values.join('|'), 'utf8').toString('base64');
    }

    decodeCustomFields(value: unknown) {
        if (typeof value !== 'string' || !value) {
            return [];
        }

        return Buffer.from(value, 'base64').toString('utf8').split('|');
    }

    private createKey() {
        return new NodeRSA(this.publicKey);
    }
}

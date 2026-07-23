import { constants, publicDecrypt, publicEncrypt } from 'node:crypto';

const encryptionOptions = (publicKey: string) => ({
    key: publicKey,
    padding: constants.RSA_PKCS1_PADDING
});

export class WebxpayCrypto {
    constructor(private readonly publicKey: string) { }

    encryptPayment(value: string) {
        return publicEncrypt(encryptionOptions(this.publicKey), Buffer.from(value, 'utf8')).toString('base64');
    }

    decryptGatewayValue(value: string) {
        return publicDecrypt(encryptionOptions(this.publicKey), Buffer.from(value, 'base64')).toString('utf8');
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
}

export type WebxpayConfig = {
    paymentUrl: string;
    secretKey: string;
    publicKey: string;
    cms: string;
    currency: string;
};

const stagingUrl = 'https://stagingxpay.info/index.php?route=checkout/billing';
const liveUrl = 'https://webxpay.com/index.php?route=checkout/billing';

const readKey = (value: string | undefined, name: string) => {
    if (!value) {
        return '';
    }

    const trimmed = value.trim();

    if (trimmed.includes('BEGIN')) {
        return trimmed.replace(/\\n/g, '\n');
    }

    try {
        return Buffer.from(trimmed, 'base64').toString('utf8').replace(/\\n/g, '\n');
    } catch {
        return trimmed;
    }
};

export const getWebxpayConfig = (): WebxpayConfig => {
    const mode = process.env.WEBXPAY_MODE === 'live' ? 'live' : 'staging';

    return {
        paymentUrl: mode === 'live'
            ? process.env.WEBXPAY_PAYMENT_URL_LIVE || liveUrl
            : process.env.WEBXPAY_PAYMENT_URL_STAGING || stagingUrl,
        secretKey: process.env.WEBXPAY_SECRET_KEY || '',
        publicKey: readKey(process.env.WEBXPAY_PUBLIC_KEY, 'WEBXPAY_PUBLIC_KEY'),
        cms: process.env.WEBXPAY_CMS || 'Node',
        currency: process.env.WEBXPAY_CURRENCY || 'LKR'
    };
};

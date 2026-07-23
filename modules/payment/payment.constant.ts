export const PAYMENT_STATUS = {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled'
} as const;

export const PAYMENT_GATEWAY = {
    WEBXPAY: 'webxpay'
} as const;

export const PAYMENT_GATEWAY_ENV = {
    LIVE: 'live',
    STAGING: 'staging'
} as const
/** Shared settlement contract. Personal GCash transfers require admin verification. */
export type PaymentState = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'cash' | 'manual_platform' | 'gcash';
export interface PaymentRecord {
  id: string;
  booking_id: string;
  method: PaymentMethod;
  status: PaymentState;
  amount_centavos: number;
  settled_at: string | null;
}
export const supportedPaymentMethods: readonly PaymentMethod[] = ['cash', 'manual_platform', 'gcash'];
export function settlementLabel(status: PaymentState) {
  return {
    pending: 'Payment pending',
    paid: 'Authorized settlement recorded',
    failed: 'Settlement failed',
    refunded: 'Refund recorded'
  }[status];
}
export function checkoutRequest() {
  return {
    method: 'cash' as const,
    status: 'pending' as const,
    charges_online: false
  };
}
// A submitted receipt never changes payment status to paid. See review_gcash_receipt.

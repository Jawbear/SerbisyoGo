/** Shared cash/manual contract. No browser event is evidence of payment. */
export type PaymentState = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'cash' | 'manual_platform';
export interface PaymentRecord {
  id: string;
  booking_id: string;
  method: PaymentMethod;
  status: PaymentState;
  amount_centavos: number;
  settled_at: string | null;
}
export const supportedPaymentMethods: readonly PaymentMethod[] = ['cash', 'manual_platform'];
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
// Future online adapters must verify provider-signed events in an Edge Function,
// then enter the database through an idempotent trusted settlement function.

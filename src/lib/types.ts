import type { Database } from './database.types';
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Row = {
  id: string;
  created_at: string;
  [key: string]: unknown;
};
export interface Provider {
  id: string;
  display_name: string;
  headline: string;
  bio: string;
  city: string;
  avatar_path: string | null;
  status: string;
  service_areas: string[];
  rating: number;
  review_count: number;
  min_rate: number;
}
export interface Service {
  id: string;
  provider_id: string;
  category_id: string;
  title: string;
  rate_centavos: number;
  duration_minutes: number;
  pricing_mode: 'fixed' | 'quote';
  active: boolean;
}
export interface Booking {
  id: string;
  reference: string;
  customer_id: string;
  provider_id: string;
  provider_service_id: string;
  service_title: string;
  description: string;
  address_snapshot: {
    line1: string;
    city: string;
    label: string;
    postal_code: string;
  };
  starts_at: string;
  ends_at: string;
  status: import('./domain').BookingStatus;
  labor_centavos: number;
  fee_centavos: number;
  commission_centavos: number;
  total_centavos: number;
  is_estimate: boolean;
  quote_accepted: boolean;
  quoted_labor_centavos: number | null;
  created_at: string;
}
export interface Release {
  id: string;
  version_name: string;
  version_code: number;
  artifact_path: string;
  byte_size: number;
  sha256: string;
  min_android: string;
  release_notes: string;
  status: string;
  published_at: string | null;
}

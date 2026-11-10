import { z } from 'zod';
import { normalizePhone } from './domain';
export const uuid = z.uuid();
export const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().transform(normalizePhone)
});
export const addressSchema = z.object({
  label: z.string().min(1).max(40),
  line1: z.string().min(5).max(250),
  city: z.string().min(2).max(100),
  postal_code: z.string().regex(/^\d{4}$/)
});
export const draftSchema = z.object({
  provider_service_id: uuid,
  description: z.string().trim().min(10).max(3000),
  address: addressSchema,
  starts_at: z.iso.datetime({
    offset: true
  }).optional()
});
export const providerSchema = z.object({
  display_name: z.string().min(2).max(100),
  headline: z.string().min(5).max(160),
  bio: z.string().min(20).max(2000),
  city: z.string().min(2).max(100),
  service_areas: z.array(z.string().min(2).max(100)).min(1).max(20)
});
export const serviceSchema = z.object({
  category_id: uuid,
  title: z.string().min(3).max(120),
  rate_centavos: z.coerce.number().int().min(0).max(100000000),
  duration_minutes: z.coerce.number().int().min(30).max(480),
  pricing_mode: z.enum(['fixed', 'quote'])
});
export const reviewSchema = z.object({
  booking_id: uuid,
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(2000)
});
export const caseSchema = z.object({
  booking_id: uuid.nullable(),
  subject: z.string().min(5).max(160),
  body: z.string().min(10).max(5000)
});
export const releaseSchema = z.object({
  version_name: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/),
  version_code: z.coerce.number().int().positive().max(2147483647),
  min_android: z.string().regex(/^\d+(?:\.\d+)?$/),
  release_notes: z.string().min(10).max(10000)
});

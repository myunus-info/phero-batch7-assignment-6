import { z } from 'zod';

const createCheckoutSessionValidationSchema = z.object({
  planName: z.enum(['STARTER_PACK', 'PRO_PACK', 'ENTERPRISE_PACK'], {
    error: 'Plan name is required (STARTER_PACK, PRO_PACK, ENTERPRISE_PACK)',
  }),
});

export const PaymentValidation = {
  createCheckoutSessionValidationSchema,
};

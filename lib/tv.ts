import { createTV } from 'tailwind-variants';

import { twMergeConfig } from '@/next-auth-solana-supabase/lib/cn';

export type { VariantProps, ClassValue } from 'tailwind-variants';

export const tv = createTV({
  twMergeConfig,
});

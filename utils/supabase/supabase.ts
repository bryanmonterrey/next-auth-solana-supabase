// Use `useSession()` or `unstable_getServerSession()` to get the NextAuth session.
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/next-auth-solana-supabase/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const getSupabase = () => {
  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        }
      },
      db: {
        schema: 'public'
      }
    }
  )
}
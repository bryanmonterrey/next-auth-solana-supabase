import { auth } from "@/auth"
import NextAuth, { DefaultSession, User } from "next-auth"
import ClientExample from "@/next-auth-solana-supabase/components/client-example"
import { SessionProvider } from "next-auth/react"

// Define user type to match your schema
interface CustomUser extends User {
  id: string;
  wallet_address: string;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at?: string;
  updated_at?: string;
  last_signed_in?: string | null;
}

export default async function ClientPage() {
  const session = await auth()
  if (session?.user) {
    // TODO: Look into https://react.dev/reference/react/experimental_taintObjectReference
    // filter out sensitive data before passing to client.
    session.user = {
      id: session.user.id,
      wallet_address: session.user.wallet_address,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    } as CustomUser
  }

  return (
    <SessionProvider basePath={"/auth"} session={session}>
      <ClientExample />
    </SessionProvider>
  )
}

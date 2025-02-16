import NextAuth, { DefaultSession, User } from "next-auth"
import "next-auth/jwt"
import { SupabaseAdapter, SupabaseAdapterOptions } from "@auth/supabase-adapter"
import jwt from "jsonwebtoken"

import Coinbase from "next-auth/providers/coinbase"
import Discord from "next-auth/providers/discord"
import CredentialsProvider from "next-auth/providers/credentials"
import { Database } from "@/next-auth-solana-supabase/types/supabase"
import { createClient } from "@/next-auth-solana-supabase/utils/supabase/server"
import { SigninMessage } from "@/next-auth-solana-supabase/utils/SigninMessage"

import Google from "next-auth/providers/google"


import Twitter from "next-auth/providers/twitter"

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

const providers = [
  CredentialsProvider({
    name: "web3-auth",
    credentials: {
      message: {
        label: "Message",
        type: "text",
      },
      signature: {
        label: "Signature",
        type: "text",
      },
      csrfToken: {
        label: "CSRF Token",
        type: "text",
      },
    },
    async authorize(credentials): Promise<CustomUser | null> {
      try {
        // Check for missing credentials
        if (!credentials?.message || !credentials?.signature || !credentials?.csrfToken) {
          console.error('Missing credentials:', { 
            message: !!credentials?.message,
            signature: !!credentials?.signature,
            csrfToken: !!credentials?.csrfToken 
          });
          throw new Error('Missing credentials');
        }

        const signinMessage = new SigninMessage(
          JSON.parse((credentials?.message as string) || "{}")
        );

        const nextAuthUrl = new URL(process.env.NEXTAUTH_URL!);

        // Add domain validation logging
        console.log('Domain validation:', {
          messageDomain: signinMessage.domain,
          nextAuthDomain: nextAuthUrl.host
        });

        if (signinMessage.domain !== nextAuthUrl.host) {
          console.error('Domain mismatch:', {
            messageDomain: signinMessage.domain,
            nextAuthDomain: nextAuthUrl.host
          });
          throw new Error("Domain mismatch");
        }

        // Add CSRF validation logging
        console.log('CSRF validation:', {
          messageNonce: signinMessage.nonce,
          providedCsrfToken: credentials?.csrfToken
        });

        if (signinMessage.nonce !== credentials?.csrfToken) {
          console.error('CSRF Mismatch:', {
            messageNonce: signinMessage.nonce,
            csrfToken: credentials?.csrfToken
          });
          throw new Error("CSRF token mismatch");
        }

        const validationResult = await signinMessage.validate(
          (credentials?.signature as string) || ""
        );

        // Add signature validation logging
        console.log('Signature validation result:', validationResult);

        if (!validationResult) {
          throw new Error("Could not validate the signed message");
        }

        // Check if user exists in Supabase
        const supabase = await createClient();
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select(`
            id,
            wallet_address,
            username,
            avatar_url,
            bio,
            role,
            created_at,
            updated_at,
            last_signed_in
          `)
          .eq('wallet_address', signinMessage.publicKey)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error fetching user:', fetchError);
        }

        const currentTime = new Date().toISOString();

        if (!existingUser) {
          console.log('User not found. Returning new user object for adapter to create.');
          // IMPORTANT: Do not manually insert.
          // Return a user object without performing a manual DB insert.
          return {
            // Leave `id` empty or undefined so the adapter can generate it properly
            id: "", 
            wallet_address: signinMessage.publicKey,
            role: 'user',
            created_at: currentTime,
            updated_at: currentTime,
            last_signed_in: currentTime,
          } as CustomUser;
        }

        // Update existing user's last sign in
        const { error: updateError } = await supabase
          .from('users')
          .update({
            last_signed_in: currentTime,
            updated_at: currentTime
          })
          .eq('wallet_address', signinMessage.publicKey);

        if (updateError) {
          console.error('Error updating user:', updateError);
        }

        return {
          id: existingUser.id,
          wallet_address: existingUser.wallet_address,
          username: existingUser.username,
          avatar_url: existingUser.avatar_url,
          bio: existingUser.bio,
          created_at: existingUser.created_at,
          updated_at: existingUser.updated_at,
          last_signed_in: currentTime,
        } as CustomUser;

      } catch (error) {
        console.error("Error during authorization:", error);
        return null;
      }
    },
  }),
];


export const { auth, signIn, signOut, handlers: { GET, POST }, handlers } = NextAuth({
  debug: !!process.env.AUTH_DEBUG,
  theme: { logo: "https://authjs.dev/img/logo-sm.png" },
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  }),
  logger: {
    error: (code, ...message) => {
      console.error(code, message)
      console.log('Debug ENV:', {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSecret: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      })
      console.log('Providers:', providers);
      console.log('Auth:', auth);
      console.log('NextAuth:', NextAuth);
      console.log('signIn:', signIn);
      console.log('signOut:', signOut);
      console.log('handlers:', handlers);
      console.log('handlers:', handlers);
      console.log('GET:', GET);
      console.log('POST:', POST);   
    },
  },
  providers: [
    ...providers
  ],
  session: { 
    strategy: "jwt",
    maxAge: 5 * 60, // 5 minutes
  },
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl

      if (pathname === "/middleware-example") return !!auth

      return true

    },
    async session({ session, token, user }) {
      if (token) {
        session.user = token.user as any;

        session.supabaseAccessToken = token.supabaseAccessToken as string;

      }
      console.log('Session:', session);
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.user = user as CustomUser;
      }
      if (account) {
        const signingSecret = process.env.SUPABASE_JWT_SECRET;
        if (signingSecret) {
          const payload = {
            aud: "authenticated",
            exp: Math.floor(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime() / 1000),
            sub: user?.id,
            email: user?.email,
            role: "authenticated",
          };
          token.supabaseAccessToken = jwt.sign(payload, signingSecret);
        }
      }
      console.log('Token:', token);
      return token;
    },
    async signIn({ user, account }) {
      console.log('Sign in:', user, account);
      return true;
    }
    
  },
  
  experimental: { enableWebAuthn: true },
})

declare module "next-auth" {
  interface Session {
    accessToken?: string
    supabaseAccessToken?: string
    user: CustomUser  // Use our CustomUser type instead
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    supabaseAccessToken?: string
    user: CustomUser  // Use our CustomUser type instead
  }
}

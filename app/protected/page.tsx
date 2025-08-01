import FetchDataSteps from "@/next-auth-solana-supabase/components/tutorial/fetch-data-steps";
import { createClient } from "@/next-auth-solana-supabase/utils/supabase/server";
import { InfoIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react"
import { auth } from "@/auth"// adjust path as needed


export default async function ProtectedPage() {
  const supabase = await createClient();

  const {
    data: userData,  // Rename to avoid confusion
    error,
  } = await supabase.auth.getUser();

  console.log(userData);

  if (error) {
    console.error("Error fetching user data from Supabase:", error);
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          This is a protected page that you can only see as an authenticated user.
        </div>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Your user details</h2>
        <pre className="text-xs font-mono p-3 rounded border max-h-32 overflow-auto">
          {JSON.stringify(userData, null, 2)}
        </pre>
      </div>
      <div>
        <h2 className="font-bold text-2xl mb-4">Next steps</h2>
        <FetchDataSteps />
      </div>
    </div>
  );
}

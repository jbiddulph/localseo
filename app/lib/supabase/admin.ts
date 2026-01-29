import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const getSupabaseAdmin = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it for server-side report access."
    );
  }

  try {
    const tokenPart = supabaseServiceRoleKey.split(".")[1];
    const payload = JSON.parse(
      Buffer.from(tokenPart ?? "", "base64").toString("utf8")
    ) as { role?: string };
    if (payload.role !== "service_role") {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not a service_role token. Please use the service_role key from Supabase Settings > API."
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
};

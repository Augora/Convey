import { createClient } from "@supabase/supabase-js";

export const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function handleSupabaseError({ error, ...rest }) {
  if (error) {
    throw error;
  }
  return rest;
}

export function GetDeputesFromSupabase() {
  return supabaseClient
    .from<Types.Canonical.Depute>("Depute")
    .select()
    .then(handleSupabaseError)
    .then((d) => d.body);
}

const { createClient } = require("@supabase/supabase-js");

const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function handleSupabaseError({ error, ...rest }) {
  if (error) {
    throw error;
  }
  return rest;
}

function GetDeputesFromSupabase() {
  return supabaseClient
    .from("Depute")
    .select()
    .then(handleSupabaseError)
    .then((d) => d.body);
}

module.exports = {
  GetDeputesFromSupabase,
  supabaseClient,
};

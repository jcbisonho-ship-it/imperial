import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://grmdbjthndpackhrvhid.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdybWRianRobmRwYWNraHJ2aGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMzYxNTUsImV4cCI6MjA3ODgxMjE1NX0.p34SaeRWMh7W39DivCBcpNKIn3wlC1Qx8oiJi25HClA';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};

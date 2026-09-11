/* =====================================================
   ATHR STORE — SUPABASE CONNECTION
   Publishable key only. Never place a Secret key here.
===================================================== */

const ATHR_SUPABASE_URL = "https://ojhnobjphdrwlpxerlco.supabase.co";
const ATHR_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_q-EqL8SXNZpTRt1hEmslBA_xhGF5d18";

const athrSupabase = window.supabase.createClient(
    ATHR_SUPABASE_URL,
    ATHR_SUPABASE_PUBLISHABLE_KEY
);

import { createClient } from '@supabase/supabase-js'

/**
 * CONSIGNMENT RELATIONSHIP REFERENCES
 * -----------------------------------
 * prepared_by          → users!consignments_prepared_by_fkey
 * delivered_by         → users!consignments_delivered_by_fkey
 * billed_by            → users!consignments_billed_by_fkey
 * payment_received_by  → users!consignments_payment_received_by_fkey
 * delivery_staff_id    → users!consignments_delivery_staff_id_fkey
 *
 * Example:
 * supabase
 *   .from('consignments')
 *   .select(`
 *     id,
 *     dc_number,
 *     prepared_by_user:users!consignments_prepared_by_fkey(id, full_name)
 *   `)
 */

const supabaseUrl = 'https://pbokyntccdathrbnxjbj.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBib2t5bnRjY2RhdGhyYm54amJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjcwMjYsImV4cCI6MjA3ODIwMzAyNn0.Viibo3UY4RLY8OZZoy8wdz9ZM9JuGtM1T_ovZfriFAc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})


import { createClient } from '@supabase/supabase-js'

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


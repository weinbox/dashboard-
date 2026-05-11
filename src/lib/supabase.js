import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wlzwtsvvvzlprlmzukks.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsend0c3Z2dnpscHJsbXp1a2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzc0MzYsImV4cCI6MjA5Mjg1MzQzNn0.1LlRBp6V2FY2kqtqJ-rFqQTtfnq8b2MeTd8KQRSALBQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

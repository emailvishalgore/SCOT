// SCOT TOPAZ Core Team Portal - Supabase Client Init
const cloudUrl = 'https://ptpxhvohifkphcgiujox.supabase.co';
const cloudAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0cHhodm9oaWZrcGhjZ2l1am94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjE2OTYsImV4cCI6MjA5Nzc5NzY5Nn0.qukz4r_RIov7b5o7AzF3xfpuaUrqXMQhIMhlP18O_EQ';

// Initialize the Supabase Client
const { createClient } = window.supabase;
export const supabase = createClient(cloudUrl, cloudAnonKey);

export default supabase;

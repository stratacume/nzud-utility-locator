import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://phmdjsrqmefzhfhyvxok.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjJkNTkzMzlkLWExOWYtNGViMi04ZTU2LTQ2NTk0MDAyODU0NyJ9.eyJwcm9qZWN0SWQiOiJwaG1kanNycW1lZnpoZmh5dnhvayIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc4MTIwNTIwLCJleHAiOjIwOTM0ODA1MjAsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.H5kDqSsT9Enef1MRY-4bpC1VsMDJXlnNEjulNXEUjHc';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };
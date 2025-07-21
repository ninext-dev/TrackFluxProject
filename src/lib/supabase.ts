import { createClient } from '@supabase/supabase-js';

// Environment configurations
const environments = {
  reforpan: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    serviceKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  },
  test: {
    url: import.meta.env.VITE_SUPABASE_TEST_URL || import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_TEST_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
    serviceKey: import.meta.env.VITE_SUPABASE_TEST_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  }
};

// Get current environment from localStorage or default to 'reforpan'
const getCurrentEnv = () => localStorage.getItem('dbEnv') || 'reforpan';

// Function to create Supabase clients for the current environment
const createSupabaseClients = () => {
  const env = getCurrentEnv();
  const config = environments[env as keyof typeof environments];

  if (!config.url || !config.anonKey || !config.serviceKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.');
  }

  return {
    supabase: createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }),
    supabaseAdmin: createClient(config.url, config.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'x-supabase-role': 'service_role'
        }
      }
    })
  };
};

// Export function to switch environments
export const switchEnvironment = (env: 'reforpan' | 'test') => {
  localStorage.setItem('dbEnv', env);
  window.location.reload(); // Reload to reinitialize Supabase clients
};

// Create and export clients
const { supabase, supabaseAdmin } = createSupabaseClients();
export { supabase, supabaseAdmin };
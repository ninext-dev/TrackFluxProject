import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff } from 'lucide-react';
import { DatabaseSelector } from '../components/DatabaseSelector';
import { switchEnvironment } from '../lib/supabase';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState(() => localStorage.getItem('dbEnv') || 'reforpan');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Set default environment to 'reforpan' if not already set
    if (!localStorage.getItem('dbEnv')) {
      localStorage.setItem('dbEnv', 'reforpan');
    }
    
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('E-mail ou senha incorretos');
        }
        throw signInError;
      }

      // Check if user is banned - using service role to bypass RLS
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('banned_until, ban_reason')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        }

        if (profile?.banned_until && new Date(profile.banned_until) > new Date()) {
          await supabase.auth.signOut();
          throw new Error(`Usuário banido até ${new Date(profile.banned_until).toLocaleString()}. Motivo: ${profile.ban_reason}`);
        }

        // For non-admin users, check permissions
        if (normalizedEmail !== 'admin@reforpan.com') {
          const { data: permissions, error: permError } = await supabase
            .from('user_permissions')
            .select('module')
            .eq('user_id', data.user.id);

          if (permError) throw permError;

          if (!permissions || permissions.length === 0) {
            await supabase.auth.signOut();
            throw new Error('Usuário sem permissões de acesso. Entre em contato com o administrador.');
          }
        }
      }

      // Redirect to home or intended page
      const intendedPath = location.state?.from || '/';
      navigate(intendedPath);
    } catch (error) {
      console.error('Error signing in:', error);
      setError(error instanceof Error ? error.message : 'Falha ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  const handleEnvironmentChange = (env: string) => {
    setSelectedEnv(env);
    switchEnvironment(env as 'reforpan' | 'test');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img 
            src="https://i.imgur.com/Nj5Xyw0.png" 
            alt="TrackFlux Logo" 
            className="w-48 h-48 sm:w-64 sm:h-64 object-contain"
          />
        </div>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sistema de Gestão Industrial
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-100">
          <DatabaseSelector
            selectedEnv={selectedEnv}
            onChange={handleEnvironmentChange}
          />

          <div className="mt-6 border-t border-gray-200 pt-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-mail
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Digite seu e-mail"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <footer className="fixed bottom-0 left-0 right-0 py-4 text-center text-sm text-gray-500 bg-[#f8f9fc] border-t border-gray-200 z-10">
        Powered by Gustavo Henrique and Matheus Andrade with Bolt AI
      </footer>
    </div>
  );
}
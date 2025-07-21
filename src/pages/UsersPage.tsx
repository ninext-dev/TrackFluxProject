import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Shield, Eye, EyeOff } from 'lucide-react';
import { supabase, supabaseAdmin } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface UserProfile {
  user_class: 'ADMIN' | 'STAFF' | 'NORMAL';
  banned_until: string | null;
  ban_reason: string | null;
}

interface UserPermission {
  id: string;
  user_id: string;
  module: string;
}

const MODULES = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'products', name: 'Produtos e Classificações' },
  { id: 'production-diary', name: 'PCP - Programação' },
  { id: 'formulation', name: 'PCP - Formulação' },
  { id: 'separation', name: 'PCP - Separação' },
  { id: 'tech-planning', name: 'PCP - Tech Planning' },
  { id: 'graphics', name: 'Gráfica - Programação' },
  { id: 'reports', name: 'Relatórios' },
  { id: 'users', name: 'Usuários' },
];

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    user_class: 'NORMAL' as const,
    modules: [] as string[]
  });
  const [banData, setBanData] = useState({
    userId: '',
    banUntil: '',
    banReason: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
    fetchUsers();
  }, []);

  async function checkAdminAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'admin@reforpan.com') {
      window.location.href = '/';
    }
  }

  async function fetchUsers() {
    try {
      const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      if (usersError) throw usersError;

      const { data: permissions, error: permissionsError } = await supabaseAdmin
        .from('user_permissions')
        .select('*');
      if (permissionsError) throw permissionsError;

      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('user_profiles')
        .select('*');
      if (profilesError) throw profilesError;

      // Group permissions by user
      const permissionsByUser = permissions?.reduce((acc, perm) => {
        if (!acc[perm.user_id]) acc[perm.user_id] = [];
        acc[perm.user_id].push(perm.module);
        return acc;
      }, {} as Record<string, string[]>);

      // Group profiles by user
      const profilesByUser = profiles?.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, UserProfile>);

      setUsers(users.users);
      setPermissions(permissionsByUser || {});
      setUserProfiles(profilesByUser || {});
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Falha ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (editingUser) {
        // Update user permissions
        await supabaseAdmin
          .from('user_permissions')
          .delete()
          .eq('user_id', editingUser);

        if (formData.modules.length > 0) {
          const permissionsToInsert = formData.modules.map(module => ({
            user_id: editingUser,
            module
          }));

          const { error: insertError } = await supabaseAdmin
            .from('user_permissions')
            .insert(permissionsToInsert);

          if (insertError) throw insertError;
        }

        // Update user class
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .update({ user_class: formData.user_class })
          .eq('user_id', editingUser);

        if (profileError) throw profileError;

        // Update password if provided
        if (formData.password) {
          const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
            editingUser,
            { password: formData.password }
          );

          if (passwordError) throw passwordError;
        }
      } else {
        // Create new user
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true
        });

        if (userError) throw userError;

        // Create user profile
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .insert([{
            user_id: userData.user.id,
            name: formData.email.split('@')[0],
            user_class: formData.user_class
          }]);

        if (profileError) throw profileError;

        if (formData.modules.length > 0) {
          const permissionsToInsert = formData.modules.map(module => ({
            user_id: userData.user.id,
            module
          }));

          const { error: insertError } = await supabaseAdmin
            .from('user_permissions')
            .insert(permissionsToInsert);

          if (insertError) throw insertError;
        }
      }

      setShowModal(false);
      setEditingUser(null);
      setFormData({ email: '', password: '', user_class: 'NORMAL', modules: [] });
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      setError('Falha ao salvar usuário');
    }
  }

  async function handleBanUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .update({
          banned_until: banData.banUntil ? new Date(banData.banUntil).toISOString() : null,
          ban_reason: banData.banReason || null
        })
        .eq('user_id', banData.userId);

      if (error) throw error;

      setShowBanModal(false);
      setBanData({ userId: '', banUntil: '', banReason: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      setError('Falha ao banir usuário');
    }
  }

  async function handleDelete(userId: string) {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }

    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Falha ao excluir usuário');
    }
  }

  function handleEdit(user: User) {
    setEditingUser(user.id);
    setFormData({
      email: user.email,
      password: '',
      user_class: userProfiles[user.id]?.user_class || 'NORMAL',
      modules: permissions[user.id] || []
    });
    setShowModal(true);
  }

  function handleBan(userId: string) {
    setBanData({
      userId,
      banUntil: userProfiles[userId]?.banned_until || '',
      banReason: userProfiles[userId]?.ban_reason || ''
    });
    setShowBanModal(true);
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ email: '', password: '', user_class: 'NORMAL', modules: [] });
            setShowModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Usuário
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Pesquisar por e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                E-mail
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Classe
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Módulos
              </th>
              <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => {
              const profile = userProfiles[user.id];
              const isBanned = profile?.banned_until && new Date(profile.banned_until) > new Date();
              
              return (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {profile?.user_class || 'NORMAL'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {isBanned ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Banido até {new Date(profile.banned_until).toLocaleString()}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Ativo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-2">
                      {(permissions[user.id] || []).map((module) => (
                        <span
                          key={module}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                        >
                          {MODULES.find(m => m.id === module)?.name || module}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleBan(user.id)}
                      className="text-yellow-600 hover:text-yellow-900 mr-4"
                      title={isBanned ? "Remover banimento" : "Banir usuário"}
                    >
                      <Shield className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <Shield className="h-6 w-6 text-indigo-500" />
            </div>
            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  readOnly={!!editingUser}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {editingUser ? 'Nova Senha (opcional)' : 'Senha'}
                </label>
                <div className="mt-1 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-10"
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
                <label className="block text-sm font-medium text-gray-700">
                  Classe do Usuário
                </label>
                <select
                  value={formData.user_class}
                  onChange={(e) => setFormData({ ...formData, user_class: e.target.value as 'ADMIN' | 'STAFF' | 'NORMAL' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Módulos
                </label>
                <div className="space-y-2">
                  {MODULES.map((module) => (
                    <label key={module.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.modules.includes(module.id)}
                        onChange={(e) => {
                          const modules = e.target.checked
                            ? [...formData.modules, module.id]
                            : formData.modules.filter(m => m !== module.id);
                          setFormData({ ...formData, modules });
                        }}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">{module.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                    setError(null);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {editingUser ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {userProfiles[banData.userId]?.banned_until ? 'Remover Banimento' : 'Banir Usuário'}
              </h3>
              <Shield className="h-6 w-6 text-yellow-500" />
            </div>
            <form onSubmit={handleBanUser} className="space-y-4">
              <div>
                <label htmlFor="banUntil" className="block text-sm font-medium text-gray-700">
                  Data do Banimento
                </label>
                <input
                  type="datetime-local"
                  id="banUntil"
                  value={banData.banUntil}
                  onChange={(e) => setBanData({ ...banData, banUntil: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="banReason" className="block text-sm font-medium text-gray-700">
                  Motivo do Banimento
                </label>
                <textarea
                  id="banReason"
                  value={banData.banReason}
                  onChange={(e) => setBanData({ ...banData, banReason: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowBanModal(false);
                    setBanData({ userId: '', banUntil: '', banReason: '' });
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  {userProfiles[banData.userId]?.banned_until ? 'Remover Banimento' : 'Banir Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
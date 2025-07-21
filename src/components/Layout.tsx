import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MobileDock } from './MobileDock';
import {
  Menu,
  X,
  LayoutDashboard,
  FileText,
  ClipboardList,
  Factory,
  ChevronDown,
  ChevronUp,
  Package,
  UserCog,
  Beaker,
  BookOpen,
  LogOut,
  User,
  List,
  Printer,
  FileBarChart2,
  Brain,
  Calendar,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserProfile {
  name: string;
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userPermissions, isAdmin, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    return isAdmin || userPermissions.includes(permission);
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  async function fetchUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, permission: 'dashboard' },
    {
      name: 'Cadastros',
      icon: ClipboardList,
      children: [
        { name: 'Produtos', href: '/products', icon: Package, permission: 'products' },
        { name: 'Classificações', href: '/classifications', icon: List, permission: 'products' },
        { name: 'Usuários', href: '/users', icon: UserCog, permission: 'users' },
      ],
    },
    {
      name: 'PCP',
      icon: Factory,
      children: [
        { name: 'Programação', href: '/production-diary', icon: FileBarChart2, permission: 'production-diary' },
        { name: 'Calendário', href: '/production-calendar', icon: Calendar, permission: 'production-diary' },
        { name: 'Separação', href: '/separation', icon: Package, permission: 'separation' },
        { name: 'Formulação', href: '/formulation', icon: Beaker, permission: 'formulation' },
        { name: 'Tech Planning', href: '/tech-planning', icon: Brain, permission: 'tech-planning' },
      ],
    },
    {
      name: 'Relatórios',
      icon: FileText,
      children: [
        { name: 'Diário de Produção', href: '/reports/production-diary', icon: BookOpen, permission: 'production-diary' }
      ],
    },
    {
      name: 'Gráfica',
      icon: Printer,
      children: [
        { name: 'Programação', href: '/graphics', icon: FileBarChart2, permission: 'graphics' },
        { name: 'Relatórios', href: '/graphics/reports', icon: FileText, permission: 'graphics' }
      ],
    },
  ];

  const toggleMenu = (menuName: string) => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
    }
    setOpenMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Check if a route is active
  const isRouteActive = (href: string) => {
    return location.pathname === href;
  };

  // Check if a parent menu is active (any child route is active)
  const isMenuActive = (item: any) => {
    if (item.children) {
      return item.children.some((child: any) => isRouteActive(child.href));
    }
    return isRouteActive(item.href);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Always visible but collapsed */}
      <div
        className={`fixed inset-y-0 left-0 z-30 bg-white transform transition-all duration-300 ease-in-out flex-shrink-0 hidden md:block ${
          sidebarOpen ? 'w-64' : 'w-16'
        } will-change-transform`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className={`flex items-center justify-between ${sidebarOpen ? 'h-48 px-6' : 'h-16 px-2'} border-b border-gray-200`}>
            <div className="flex items-center justify-center w-full">
              {sidebarOpen ? (
                <img
                  src="https://i.imgur.com/jHQrKhU.png"
                  alt="Logo"
                  className="h-44 object-contain"
                />
              ) : (
                <img
                  src="https://i.imgur.com/SUtalVA.png"
                  alt="Logo"
                  className="h-8 w-8 object-contain"
                />
              )}
            </div>
            {sidebarOpen && (
              <button
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Fechar</span>
                <X className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const hasAccessibleChildren = item.children?.some(child => hasPermission(child.permission));
              
              if (!hasPermission(item.permission) && !hasAccessibleChildren) {
                return null;
              }

              const isActive = isMenuActive(item);

              return (
                <div key={item.name}>
                  {item.children ? (
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          toggleMenu(item.name);
                        }}
                        className={`w-full px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between group ${
                          isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600'
                        }`}
                      >
                        <div className="flex items-center min-w-0">
                          <item.icon className={`h-5 w-5 mr-2 ${isActive ? 'text-indigo-600' : ''}`} />
                          {sidebarOpen && item.name}
                        </div>
                        {sidebarOpen && (
                          openMenus[item.name] ? (
                            <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                          )
                        )}
                      </button>
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        sidebarOpen && openMenus[item.name] ? 'max-h-96' : 'max-h-0'
                      }`}>
                        <div className="space-y-1 ml-8">
                          {item.children.map((subItem) => (
                            hasPermission(subItem.permission) && (
                              <Link
                                key={subItem.name}
                                to={subItem.href}
                                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                                  isRouteActive(subItem.href)
                                    ? 'bg-indigo-50 text-indigo-600'
                                    : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                                }`}
                              >
                                <subItem.icon className="h-5 w-5 mr-2" />
                                {subItem.name}
                              </Link>
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    hasPermission(item.permission) && (
                      <Link
                        to={item.href}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                          isRouteActive(item.href)
                            ? 'bg-indigo-50 text-indigo-600'
                            : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                        }`}
                      >
                        <item.icon className="h-5 w-5 mr-2" />
                        {sidebarOpen && item.name}
                      </Link>
                    )
                  )}
                </div>
              );
            })}
          </nav>

          {/* User Profile and Sign Out */}
          <div className="p-4 border-t border-gray-200 space-y-4">
            <Link
              to="/profile"
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-indigo-600 rounded-md hover:bg-indigo-50"
            >
              <User className="h-5 w-5 mr-2" />
              {sidebarOpen && (userProfile?.name || 'Meu Perfil')}
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
            >
              <LogOut className="h-5 w-5 mr-2" />
              {sidebarOpen && 'Sair'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'} md:ml-16`}>
        <div className="sticky top-0 z-10 flex h-16 bg-white border-b border-gray-200 md:block hidden">
          <button
            type="button"
            className="px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-4 sm:py-6 pb-24 md:pb-6">
            <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
        
        {/* Mobile Dock */}
        <MobileDock />
      </div>
    </div>
  );
}
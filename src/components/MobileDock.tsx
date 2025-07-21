import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  ClipboardList,
  Factory,
  FileText,
  Printer,
  User,
  Package,
  List,
  UserCog,
  FileBarChart2,
  Calendar,
  Beaker,
  Brain,
  BookOpen,
  ChevronUp,
} from 'lucide-react';

interface SubMenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  permission?: string;
}

interface DockItem {
  name: string;
  icon: React.ComponentType<any>;
  permission?: string;
  color: string;
  href?: string;
  subItems?: SubMenuItem[];
}

export function MobileDock() {
  const location = useLocation();
  const { userPermissions, isAdmin } = useAuth();
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    return isAdmin || userPermissions.includes(permission);
  };

  const dockItems: DockItem[] = [
    { 
      name: 'Dashboard', 
      href: '/', 
      icon: LayoutDashboard, 
      permission: 'dashboard',
      color: 'indigo'
    },
    {
      name: 'Cadastros',
      icon: ClipboardList,
      color: 'purple',
      subItems: [
        { name: 'Produtos', href: '/products', icon: Package, permission: 'products' },
        { name: 'Classificações', href: '/classifications', icon: List, permission: 'products' },
        { name: 'Usuários', href: '/users', icon: UserCog, permission: 'users' },
      ]
    },
    {
      name: 'PCP',
      icon: Factory,
      color: 'blue',
      subItems: [
        { name: 'Programação', href: '/production-diary', icon: FileBarChart2, permission: 'production-diary' },
        { name: 'Calendário', href: '/production-calendar', icon: Calendar, permission: 'production-diary' },
        { name: 'Separação', href: '/separation', icon: Package, permission: 'separation' },
        { name: 'Formulação', href: '/formulation', icon: Beaker, permission: 'formulation' },
        { name: 'Tech Planning', href: '/tech-planning', icon: Brain, permission: 'tech-planning' },
      ]
    },
    {
      name: 'Relatórios',
      icon: FileText,
      color: 'green',
      subItems: [
        { name: 'Diário de Produção', href: '/reports/production-diary', icon: BookOpen, permission: 'production-diary' }
      ]
    },
    {
      name: 'Gráfica',
      icon: Printer,
      color: 'pink',
      subItems: [
        { name: 'Programação', href: '/graphics', icon: FileBarChart2, permission: 'graphics' },
        { name: 'Relatórios', href: '/graphics/reports', icon: FileText, permission: 'graphics' }
      ]
    },
    { 
      name: 'Perfil', 
      href: '/profile', 
      icon: User, 
      color: 'gray'
    },
  ];

  // Filter items based on permissions
  const visibleItems = dockItems.filter(item => {
    if (item.href) {
      return hasPermission(item.permission);
    }
    if (item.subItems) {
      return item.subItems.some(subItem => hasPermission(subItem.permission));
    }
    return false;
  });

  const isRouteActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const isItemActive = (item: DockItem) => {
    if (item.href) {
      return isRouteActive(item.href);
    }
    if (item.subItems) {
      return item.subItems.some(subItem => isRouteActive(subItem.href));
    }
    return false;
  };

  const handleItemClick = (item: DockItem) => {
    if (item.subItems) {
      setActiveSubmenu(activeSubmenu === item.name ? null : item.name);
    } else {
      setActiveSubmenu(null);
    }
  };

  // Close submenu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (submenuRef.current && !submenuRef.current.contains(event.target as Node)) {
        setActiveSubmenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close submenu when route changes
  useEffect(() => {
    setActiveSubmenu(null);
  }, [location.pathname]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden" ref={submenuRef}>
      {/* Submenu */}
      {activeSubmenu && (
        <div className="absolute bottom-20 left-0 right-0 px-4 pb-2">
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200/50 p-4 mx-auto max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">{activeSubmenu}</h3>
              <ChevronUp className="h-4 w-4 text-gray-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {dockItems
                .find(item => item.name === activeSubmenu)
                ?.subItems?.filter(subItem => hasPermission(subItem.permission))
                .map((subItem) => {
                  const SubIcon = subItem.icon;
                  const isActive = isRouteActive(subItem.href);
                  
                  return (
                    <Link
                      key={subItem.name}
                      to={subItem.href}
                      className={`flex flex-col items-center p-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <SubIcon className={`h-5 w-5 mb-1 ${
                        isActive ? 'text-indigo-600' : 'text-gray-500'
                      }`} />
                      <span className="text-xs font-medium text-center leading-tight">
                        {subItem.name}
                      </span>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Main Dock */}
      <div className="bg-white/90 backdrop-blur-lg border-t border-gray-200/50 px-4 py-2">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {visibleItems.map((item) => {
            const isActive = isItemActive(item);
            const Icon = item.icon;
            const isSubmenuOpen = activeSubmenu === item.name;
            
            return (
              <div key={item.name} className="flex flex-col items-center">
                {item.href ? (
                  <Link
                    to={item.href}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-0 ${
                      isActive
                        ? 'bg-white shadow-lg scale-110 -translate-y-1'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      isActive 
                        ? `bg-gradient-to-br from-${item.color}-100 to-${item.color}-50` 
                        : ''
                    }`}>
                      <Icon 
                        className={`h-5 w-5 ${
                          isActive ? `text-${item.color}-600` : 'text-gray-500'
                        }`} 
                      />
                    </div>
                    <span className={`text-xs mt-1 font-medium truncate max-w-[60px] ${
                      isActive ? `text-${item.color}-600` : 'text-gray-500'
                    }`}>
                      {item.name}
                    </span>
                  </Link>
                ) : (
                  <button
                    onClick={() => handleItemClick(item)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-0 ${
                      isActive || isSubmenuOpen
                        ? 'bg-white shadow-lg scale-110 -translate-y-1'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      isActive || isSubmenuOpen
                        ? `bg-gradient-to-br from-${item.color}-100 to-${item.color}-50` 
                        : ''
                    }`}>
                      <Icon 
                        className={`h-5 w-5 ${
                          isActive || isSubmenuOpen ? `text-${item.color}-600` : 'text-gray-500'
                        }`} 
                      />
                    </div>
                    <span className={`text-xs mt-1 font-medium truncate max-w-[60px] ${
                      isActive || isSubmenuOpen ? `text-${item.color}-600` : 'text-gray-500'
                    }`}>
                      {item.name}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
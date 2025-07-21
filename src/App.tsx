import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { ProductionDayPage } from './pages/ProductionDayPage';
import { ProductionDetailsPage } from './pages/ProductionDetailsPage';
import { ProductsPage } from './pages/ProductsPage';
import { UnderConstructionPage } from './pages/UnderConstructionPage';
import { GraphicsProductionDetailsPage } from './pages/GraphicsProductionDetailsPage';
import { GraphicsProductionDayPage } from './pages/GraphicsProductionDayPage';
import { GraphicsPage } from './pages/GraphicsPage';
import { FormulationPage } from './pages/FormulationPage';
import { SeparationPage } from './pages/SeparationPage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProductionReportsPage } from './pages/ProductionReportsPage';
import { ClassificationsPage } from './pages/ClassificationsPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GraphicsReportsPage } from './pages/GraphicsReportsPage'; 
import { TechPlanningPage } from './pages/TechPlanningPage';
import { ProductionCalendarPage } from './pages/ProductionCalendarPage';

function ProtectedRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const { user, loading, userPermissions, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (permission && !isAdmin && !userPermissions.includes(permission)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={
              <ProtectedRoute permission="dashboard">
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/production-diary" element={
              <ProtectedRoute permission="production-diary">
                <HomePage />
              </ProtectedRoute>
            } />
            <Route path="/products" element={
              <ProtectedRoute permission="products">
                <ProductsPage />
              </ProtectedRoute>
            } />
            <Route path="/classifications" element={
              <ProtectedRoute permission="products">
                <ClassificationsPage />
              </ProtectedRoute>
            } />
            <Route path="/formulation" element={
              <ProtectedRoute permission="formulation">
                <FormulationPage />
              </ProtectedRoute>
            } />
            <Route path="/tech-planning" element={
              <ProtectedRoute permission="tech-planning">
                <TechPlanningPage />
              </ProtectedRoute>
            } />
            <Route path="/production-calendar" element={
              <ProtectedRoute permission="production-diary">
                <ProductionCalendarPage />
              </ProtectedRoute>
            } />
            <Route path="/separation" element={
              <ProtectedRoute permission="separation">
                <SeparationPage />
              </ProtectedRoute>
            } />
            <Route path="/day/:date" element={
              <ProtectedRoute permission="production-diary">
                <ProductionDayPage />
              </ProtectedRoute>
            } />
            <Route path="/production/:id" element={
              <ProtectedRoute permission="production-diary">
                <ProductionDetailsPage />
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute permission="users">
                <UsersPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/reports/production-diary" element={
              <ProtectedRoute permission="production-diary">
                <ProductionReportsPage />
              </ProtectedRoute>
            } />
            <Route path="/graphics" element={
              <ProtectedRoute permission="graphics">
                <GraphicsPage />
              </ProtectedRoute>
            } />
            <Route path="/graphics/day/:date" element={
              <ProtectedRoute permission="graphics">
                <GraphicsProductionDayPage />
              </ProtectedRoute>
            } />
            <Route path="/graphics/production/:id" element={
              <ProtectedRoute permission="graphics">
                <GraphicsProductionDetailsPage />
              </ProtectedRoute>
            } />
            <Route path="/graphics/reports" element={
              <ProtectedRoute permission="graphics">
                <GraphicsReportsPage />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
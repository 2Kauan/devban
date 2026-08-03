import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { PublicRoute } from '@/components/shared/PublicRoute';
import { ProjectLayout } from '@/components/layout/ProjectLayout';
import { isNative } from '@/lib/capacitor';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

// Lazy loading das páginas para Code Splitting e otimização de Bundle Size (<400KB)
const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Auth/Login'));
const Register = lazy(() => import('@/pages/Auth/Register'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Project = lazy(() => import('@/pages/Project'));
const Admin = lazy(() => import('@/pages/Admin'));
const Team = lazy(() => import('@/pages/Team'));
const Settings = lazy(() => import('@/pages/Settings'));
const Reports = lazy(() => import('@/pages/Reports'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Integrations = lazy(() => import('@/pages/Integrations'));
const SharedProject = lazy(() => import('@/pages/SharedProject'));
const Preview = lazy(() => import('@/pages/Preview'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Projects = lazy(() => import('@/pages/Projects'));
const SharedProjects = lazy(() => import('@/pages/SharedProjects'));
const ProjectDashboard = lazy(() => import('@/pages/ProjectDashboard'));
const ProjectTeam = lazy(() => import('@/pages/ProjectTeam'));
const ProjectActivity = lazy(() => import('@/pages/ProjectActivity'));
const ProjectSettings = lazy(() => import('@/pages/ProjectSettings'));
const ProjectPlanning = lazy(() => import('@/pages/ProjectPlanning'));
const ProjectHealth = lazy(() => import('@/pages/ProjectHealth'));
const ProjectAI = lazy(() => import('@/pages/Project/AI'));
const ProjectCheckout = lazy(() => import('@/pages/ProjectCheckout'));
const ResetPassword = lazy(() => import('@/pages/Auth/ResetPassword'));
const ShareTarget = lazy(() => import('@/pages/ShareTarget'));

function PageLoadingFallback() {
  return (
    <div className="flex h-[70vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    </div>
  );
}

function RootRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (isNative || user) {
    return <Navigate to="/projects" replace />;
  }
  return <Landing />;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route element={<MainLayout />}>
            {/* Rotas Públicas Abertas */}
            <Route path="/" element={<RootRoute />} />
            <Route path="/shared/:token" element={<SharedProject />} />
            <Route path="/preview" element={<Preview />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Rotas para visitantes apenas */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Rotas Protegidas para usuários logados */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/shared-projects" element={<SharedProjects />} />

              <Route path="/team" element={<Team />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/share-target" element={<ShareTarget />} />
              
              <Route path="/project/:id/checkout" element={<ProjectCheckout />} />
              
              <Route path="/project/:id" element={<ProjectLayout />}>
                <Route index element={<Project />} />
                <Route path="resumo" element={<ProjectDashboard />} />
                <Route path="team" element={<ProjectTeam />} />
                <Route path="planning" element={<ProjectPlanning />} />
                <Route path="activity" element={<ProjectActivity />} />
                <Route path="health" element={<ProjectHealth />} />
                <Route path="settings" element={<ProjectSettings />} />
                <Route path="ai" element={<ProjectAI />} />
              </Route>
            </Route>

            {/* Rotas Protegidas para Admins */}
            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/admin" element={<Admin />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

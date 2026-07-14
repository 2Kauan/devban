import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { PublicRoute } from '@/components/shared/PublicRoute';

import Landing from '@/pages/Landing';
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import Dashboard from '@/pages/Dashboard';
import Project from '@/pages/Project';
import Admin from '@/pages/Admin';
import Team from '@/pages/Team';
import Settings from '@/pages/Settings';
import Reports from '@/pages/Reports';
import Notifications from '@/pages/Notifications';
import SharedProject from '@/pages/SharedProject';
import Preview from '@/pages/Preview';
import Calendar from '@/pages/Calendar';
import NotFound from '@/pages/NotFound';
import Projects from '@/pages/Projects';
import ProjectDashboard from '@/pages/ProjectDashboard';
import { ProjectLayout } from '@/components/layout/ProjectLayout';
import ProjectTeam from '@/pages/ProjectTeam';
import ProjectActivity from '@/pages/ProjectActivity';
import ProjectSettings from '@/pages/ProjectSettings';
import ProjectPlanning from '@/pages/ProjectPlanning';
import ProjectAI from '@/pages/Project/AI';
import ProjectCheckout from '@/pages/ProjectCheckout';
import ResetPassword from '@/pages/Auth/ResetPassword';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          {/* Rotas Públicas Abertas */}
          <Route path="/" element={<Landing />} />
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

            <Route path="/team" element={<Team />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/notifications" element={<Notifications />} />
            
            <Route path="/project/:id/checkout" element={<ProjectCheckout />} />
            
            <Route path="/project/:id" element={<ProjectLayout />}>
              <Route index element={<Project />} />
              <Route path="resumo" element={<ProjectDashboard />} />
              <Route path="team" element={<ProjectTeam />} />
              <Route path="planning" element={<ProjectPlanning />} />
              <Route path="activity" element={<ProjectActivity />} />
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
    </BrowserRouter>
  );
}

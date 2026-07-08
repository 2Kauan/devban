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
import SharedProject from '@/pages/SharedProject';
import Preview from '@/pages/Preview';
import NotFound from '@/pages/NotFound';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          {/* Rotas Públicas Abertas */}
          <Route path="/" element={<Landing />} />
          <Route path="/shared/:token" element={<SharedProject />} />
          <Route path="/preview" element={<Preview />} />
          
          {/* Rotas para visitantes apenas */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Rotas Protegidas para usuários logados */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/team" element={<Team />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/project/:id" element={<Project />} />
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

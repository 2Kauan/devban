import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';

export function MainLayout() {
  const location = useLocation();
  const isLanding = location.pathname === '/' || location.pathname === '/preview';

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {isLanding && <Header />}
      <main className={`flex-1 flex flex-col w-full h-full ${isLanding ? 'pt-16' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}

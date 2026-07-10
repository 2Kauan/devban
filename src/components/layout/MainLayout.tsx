import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';

export function MainLayout() {
  const location = useLocation();
  // We only want the old Header for /preview, since / now has its own Navbar.
  const hasPublicHeader = location.pathname === '/preview';

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {hasPublicHeader && <Header />}
      <main className={`flex-1 flex flex-col w-full h-full ${hasPublicHeader ? 'pt-16' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}

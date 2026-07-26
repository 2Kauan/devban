import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { isNative } from '@/lib/capacitor';

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  // We only want the old Header for /preview, since / now has its own Navbar.
  const hasPublicHeader = location.pathname === '/preview';

  useEffect(() => {
    if (isNative) {
      const handler = App.addListener('appUrlOpen', (data: any) => {
        try {
          // data.url: com.flowkanban.app://integrations#access_token=...
          const urlPath = data.url.split('://')[1];
          if (urlPath) {
            const path = urlPath.split('#')[0]; // ex: "integrations" ou "shared/123"
            if (path) {
              navigate('/' + path);
            }
          }
        } catch (e) {
          console.error('Erro de navegação no Deep Link:', e);
        }
      });
      return () => {
        handler.then(h => h.remove());
      };
    }
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {hasPublicHeader && <Header />}
      <main className={`flex-1 flex flex-col w-full h-full ${hasPublicHeader ? 'pt-16' : ''}`}>
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  );
}

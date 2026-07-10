import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { motion, AnimatePresence } from 'framer-motion';

export function MainLayout() {
  const location = useLocation();
  // We only want the old Header for /preview, since / now has its own Navbar.
  const hasPublicHeader = location.pathname === '/preview';

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {hasPublicHeader && <Header />}
      <main className={`flex-1 flex flex-col w-full h-full ${hasPublicHeader ? 'pt-16' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex-1 flex flex-col h-full w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <CommandPalette />
    </div>
  );
}

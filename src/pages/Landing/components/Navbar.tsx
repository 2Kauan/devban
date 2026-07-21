import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { setTheme, isDark } = useTheme();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        isScrolled 
          ? 'bg-background/80 backdrop-blur-md border-border/50 shadow-sm' 
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <img src="/logo-devban.webp" alt="DevBan" className="h-24 w-auto object-contain group-hover:scale-105 transition-transform dark:hidden" />
          <img src="/logo-branca2.png" alt="DevBan" className="h-24 w-auto object-contain group-hover:scale-105 transition-transform hidden dark:block" />
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Recursos
          </a>
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Como Funciona
          </a>
          <a href="#teams" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Equipes
          </a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Preços
          </a>
          <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            FAQ
          </a>
        </nav>

        {/* CTA & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            aria-label="Alternar tema"
          >
            {isDark ? (
              <Sun size={20} className="text-amber-500 hover:rotate-12 transition-transform" />
            ) : (
              <Moon size={20} className="text-slate-700 hover:-rotate-12 transition-transform" />
            )}
          </button>
          <Link to="/login" className="text-sm font-medium bg-primary text-primary-foreground px-3 py-2 sm:px-4 sm:py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap">
            Entrar
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

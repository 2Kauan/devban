import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

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
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <img src="/logo-devban.webp" alt="DevBan" className="h-24 w-auto object-contain group-hover:scale-105 transition-transform" />
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

        {/* CTA */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link to="/login" className="hidden sm:block text-sm font-medium hover:text-primary transition-colors">
            Entrar
          </Link>
          <Link 
            to="/register" 
            className="text-sm font-medium bg-primary text-primary-foreground px-3 py-2 sm:px-4 sm:py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
          >
            Começar Grátis
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

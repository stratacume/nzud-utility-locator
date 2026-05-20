import React, { useState, useEffect } from 'react';
import { Phone, LayoutDashboard, User, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NavigationProps {
  onBookClick?: () => void;
}

interface NavItem {
  label: string;
  id?: string;
  route?: string;
}

const Navigation: React.FC<NavigationProps> = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (item: NavItem) => {
    if (item.route) {
      navigate(item.route);
      setIsMobileMenuOpen(false);
    } else if (item.id) {
      scrollTo(item.id);
    }
  };

  const navItems: NavItem[] = [
    { label: 'Home', id: 'hero' },
    { label: 'Services', id: 'services' },
    { label: 'Featured Jobs', route: '/recent-jobs' },
    { label: 'Book', id: 'pricing' },

  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b ${
        isScrolled
          ? 'bg-brand-black/95 backdrop-blur-md border-brand-orange/30 shadow-2xl'
          : 'bg-brand-black/80 backdrop-blur-sm border-transparent'
      }`}
      // Respect the iOS/Android system status-bar area (notch / time / battery row).
      // env() resolves to 0 on devices without a notch, so this is a no-op on desktop.
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="h-0.5 bg-brand-orange" />


      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => scrollTo('hero')} className="flex items-center" aria-label="Home">
            <span className="sr-only">Home</span>
          </button>

          <div className="hidden lg:flex items-center gap-7">
            {navItems.map(item => (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className="text-white hover:text-brand-orange text-sm font-bold uppercase tracking-wider transition-colors"
              >
                {item.label}
              </button>
            ))}

            <span className="w-px h-5 bg-brand-silver/30" />
            <button
              onClick={() => navigate('/portal')}
              className="flex items-center gap-1.5 text-brand-silver hover:text-brand-orange text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <User className="w-4 h-4" /> Portal
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 text-brand-silver hover:text-brand-orange text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> Admin
            </button>

            <a
              href="tel:0272670217"
              className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-light text-white px-4 py-2 font-black text-sm tracking-tight transition-colors"
            >
              <Phone className="w-4 h-4" /> 027 267 0217
            </a>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-white p-2 hover:text-brand-orange transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden bg-brand-navy border-t border-brand-orange/30 py-3">
            {navItems.map(item => (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className="block w-full text-left text-white hover:text-brand-orange hover:bg-white/5 px-4 py-3 font-bold uppercase tracking-wider text-sm"
              >
                {item.label}
              </button>
            ))}

            <button
              onClick={() => { navigate('/portal'); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-2 text-brand-silver hover:text-brand-orange px-4 py-3 w-full text-left text-sm font-bold uppercase"
            >
              <User className="w-4 h-4" /> Customer Portal
            </button>
            <button
              onClick={() => { navigate('/admin'); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-2 text-brand-silver hover:text-brand-orange px-4 py-3 w-full text-left text-sm font-bold uppercase"
            >
              <LayoutDashboard className="w-4 h-4" /> Admin
            </button>

            <a
              href="tel:0272670217"
              className="flex items-center justify-center gap-2 mx-4 mt-2 bg-brand-orange text-white py-3 font-black uppercase tracking-tight"
            >
              <Phone className="w-4 h-4" /> 027 267 0217
            </a>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;

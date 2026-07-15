import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfileModal } from '@/components/ui/UserProfileModal';

export function UserProfileButton() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { id: projectId } = useParams<{ id: string }>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!user) return null;

  const getInitial = () => {
    return profile?.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U';
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        title="Meu Perfil"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className="font-bold text-sm">{getInitial()}</span>
        )}
      </button>

      {isOpen && (
        <UserProfileModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          userId={user.id}
          projectId={projectId}
        />
      )}
    </div>
  );
}

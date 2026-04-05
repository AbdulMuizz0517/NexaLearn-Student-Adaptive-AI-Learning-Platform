import { Button } from './ui/button';
import { Sparkles, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NavBarProps {
  userName?: string;
  userRole?: 'student' | 'teacher' | 'admin' | null;
  onLogout?: () => void;
}

export default function NavBar({ userName, userRole, onLogout }: NavBarProps) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  
  return (
    <nav className={`border-b px-6 py-4 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-indigo-600" />
          <span className={`text-2xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>NexaLearn</span>
        </div>
        
        {userName && userRole && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{userName}</p>
              <p className={`capitalize ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{userRole}</p>
            </div>
            <Button variant="outline" size="icon" onClick={toggleDarkMode} className={isDarkMode ? 'border-gray-600 text-white hover:bg-gray-800' : ''}>
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout} className={isDarkMode ? 'border-gray-600 text-white hover:bg-gray-800' : ''}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
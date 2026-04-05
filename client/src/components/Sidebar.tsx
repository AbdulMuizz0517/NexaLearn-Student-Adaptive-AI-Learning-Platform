import { Button } from './ui/button';
import { LayoutDashboard, BookOpen, Brain, Users, Bell, Settings, UserCircle, ChevronLeft, ChevronRight, MessageSquare, BarChart3 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';

interface SidebarProps {
  userRole: 'student' | 'teacher' | 'admin';
  currentScreen?: string;
  onNavigate: (screen: string) => void;
}

export default function Sidebar({ userRole, currentScreen, onNavigate }: SidebarProps) {
  const { isDarkMode } = useTheme();
  const { isCollapsed, toggleSidebar } = useSidebar();
  
  const studentItems = [
    { id: 'student-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'course-library', icon: BookOpen, label: 'My Courses' },
    { id: 'quiz-home', icon: Brain, label: 'Quizzes' },
    { id: 'student-profile', icon: UserCircle, label: 'Profile' },
    { id: 'student-report', icon: BarChart3, label: 'My Report' },
    { id: 'feedback', icon: MessageSquare, label: 'Feedback' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const adminItems = [
    { id: 'admin-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'admin-report', icon: BarChart3, label: 'Reports' },
    { id: 'user-management', icon: Users, label: 'Manage Users' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const items = userRole === 'admin' ? adminItems : studentItems;

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} border-r min-h-screen p-4 transition-all duration-300 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      {/* Collapse Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleSidebar}
        className={`w-full mb-4 ${isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'hover:bg-gray-100'} ${isCollapsed ? 'justify-center' : 'justify-end'}`}
      >
        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </Button>
      
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} ${
                isActive 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700' 
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    : 'hover:bg-gray-100'
              }`}
              onClick={() => onNavigate(item.id)}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && item.label}
            </Button>
          );
        })}
      </div>
    </aside>
  );
}
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Card, CardContent } from '../ui/card';
import { Bell } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';

interface NotificationsProps {
  onNavigate: (screen: string) => void;
  userRole: 'student' | 'teacher' | 'admin';
}

export default function Notifications({ onNavigate, userRole }: NotificationsProps) {
  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar 
        userName={userName} 
        userRole={userRole} 
        onLogout={handleLogout}
      />
      
      <div className="flex">
        <Sidebar userRole={userRole} currentScreen="notifications" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl mb-6">Notifications</h1>
            
            {/* Empty State */}
            <Card className="shadow-lg">
              <CardContent className="py-16">
                <div className="text-center">
                  <div className="inline-flex p-6 bg-gray-100 rounded-full mb-6">
                    <Bell className="w-12 h-12 text-gray-400" />
                  </div>
                  <h2 className="text-2xl text-gray-700 mb-2">No Notifications Yet</h2>
                  <p className="text-gray-500">
                    You'll see notifications here when there are updates about your courses, quizzes, or system announcements.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

import { useState } from 'react';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface EditProfileProps {
  onNavigate: (screen: string) => void;
  userRole: 'student' | 'teacher' | 'admin' | null;
}

export default function EditProfile({ onNavigate, userRole }: EditProfileProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = () => {
    // Save logic here
    onNavigate('student-profile');
  };

  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole={userRole} onLogout={handleLogout} />
      
      <div className="flex">
        <Sidebar userRole={userRole || 'student'} currentScreen="student-profile" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-3xl mx-auto">
            {/* Back Button */}
            <Button variant="ghost" onClick={() => onNavigate('student-profile')} className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
            
            <h1 className="text-4xl mb-6">Edit Profile Information</h1>
            
            <Card className="shadow-md">
              <CardContent className="pt-6">
                <form className="space-y-6">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="mt-2 bg-gray-100"
                    />
                    <p className="text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                </form>
              </CardContent>
            </Card>
            
            {/* Action Buttons */}
            <div className="flex gap-4 mt-6">
              <Button 
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => onNavigate('student-profile')}
              >
                Cancel
              </Button>
              
              <Button 
                size="lg"
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                onClick={handleSave}
              >
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

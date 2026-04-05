import { useState } from 'react';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Edit, Lock, LogOut, BookOpen, Brain, Award, Flame, Eye, EyeOff, X } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import axiosClient from '../../api/axiosClient';

interface StudentProfileProps {
  onNavigate: (screen: string) => void;
  userRole: 'student' | 'teacher' | 'admin' | null;
}


export default function StudentProfile({ onNavigate, userRole }: StudentProfileProps) {
  const userName = useUserName();
  const handleLogout = useLogout();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');

    if (!user?.id) {
      setPwError('Session expired. Please log in again.');
      return;
    }

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setPwError('All fields are required');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setPwError('Password must include an uppercase letter');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setPwError('Password must include a number');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      setPwError('Password must include a symbol (!@#$%...)');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError('New passwords do not match');
      return;
    }

    setPwLoading(true);
    try {
      const res = await axiosClient.post('/auth/change-password', {
        user_id: Number(user.id),
        old_password: oldPassword.trim(),
        new_password: newPassword.trim(),
      });
      if (res.data) {
        setPwSuccess('Password changed successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => setShowPasswordModal(false), 1500);
      }
    } catch (err: any) {
      setPwError(err?.response?.data?.detail || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole={userRole} onLogout={handleLogout} />
      
      <div className="flex">
        <Sidebar userRole={userRole || 'student'} currentScreen="student-profile" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-4xl mb-6">My Profile</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Personal Information</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onNavigate('edit-profile')}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-gray-600 mb-1">Full Name</p>
                        <p className="text-xl text-gray-900">{user?.full_name || 'Not set'}</p>
                      </div>
                      
                      <div>
                        <p className="text-gray-600 mb-1">Email</p>
                        <p className="text-xl text-gray-900">{user?.email || 'Not set'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Learning Stats */}
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle>Learning Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-indigo-50 rounded-lg">
                        <div className="inline-flex p-3 bg-indigo-100 rounded-lg mb-2">
                          <BookOpen className="w-6 h-6 text-indigo-600" />
                        </div>
                        <p className="text-2xl text-indigo-600 mb-1">--</p>
                        <p className="text-gray-600">Courses Enrolled</p>
                      </div>
                      
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="inline-flex p-3 bg-purple-100 rounded-lg mb-2">
                          <Brain className="w-6 h-6 text-purple-600" />
                        </div>
                        <p className="text-2xl text-purple-600 mb-1">--</p>
                        <p className="text-gray-600">Quizzes Taken</p>
                      </div>
                      
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="inline-flex p-3 bg-green-100 rounded-lg mb-2">
                          <Award className="w-6 h-6 text-green-600" />
                        </div>
                        <p className="text-2xl text-green-600 mb-1">--</p>
                        <p className="text-gray-600">Avg Score</p>
                      </div>
                      
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="inline-flex p-3 bg-orange-100 rounded-lg mb-2">
                          <Flame className="w-6 h-6 text-orange-600" />
                        </div>
                        <p className="text-2xl text-orange-600 mb-1">--</p>
                        <p className="text-gray-600">Day Streak</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Quick Actions Sidebar */}
              <div className="space-y-6">
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle>Account Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => onNavigate('edit-profile')}
                    >
                      <Edit className="w-5 h-5 mr-3" />
                      Edit Profile
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => {
                        setShowPasswordModal(true);
                        setPwError('');
                        setPwSuccess('');
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                      }}
                    >
                      <Lock className="w-5 h-5 mr-3" />
                      Change Password
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Logout
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="shadow-md bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
                  <CardContent className="pt-6">
                    <h3 className="text-xl mb-2">Keep Learning!</h3>
                    <p className="text-indigo-100 mb-4">
                      You're doing great! Complete 3 more lessons to maintain your streak.
                    </p>
                    <Button 
                      variant="secondary" 
                      className="w-full"
                      onClick={() => onNavigate('course-library')}
                    >
                      Continue Learning
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Change Password
              </h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Current Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showOldPw ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button type="button" onClick={() => setShowOldPw(!showOldPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label>New Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="mt-1"
                />
              </div>

              {pwError && <p className="text-red-500 text-sm font-medium">{pwError}</p>}
              {pwSuccess && <p className="text-green-500 text-sm font-medium">{pwSuccess}</p>}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  onClick={handleChangePassword}
                  disabled={pwLoading}
                >
                  {pwLoading ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

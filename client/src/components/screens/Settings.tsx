import { useState } from 'react';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Moon, Sun, Lock, HelpCircle, Mail, AlertTriangle, Eye, EyeOff, X, CheckCircle, Loader2 } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';

interface SettingsProps {
  onNavigate: (screen: string) => void;
  userRole: 'student' | 'teacher' | 'admin';
}

export default function Settings({ onNavigate, userRole }: SettingsProps) {
  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { user } = useAuth();

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const validatePassword = (): boolean => {
    const errs: Record<string, string> = {};
    if (!oldPassword) errs.oldPassword = 'Current password is required';
    if (!newPassword) errs.newPassword = 'New password is required';
    else if (newPassword.length < 6) errs.newPassword = 'Min 6 characters';
    else if (!/[A-Z]/.test(newPassword)) errs.newPassword = 'Must include an uppercase letter';
    else if (!/[0-9]/.test(newPassword)) errs.newPassword = 'Must include a number';
    else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) errs.newPassword = 'Must include a symbol (!@#$%...)';
    if (newPassword && newPassword === oldPassword) errs.newPassword = 'New password must differ from current';
    if (newPassword !== confirmNewPassword) errs.confirmNewPassword = 'Passwords do not match';
    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePassword() || !user?.id) return;
    setChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess(false);
    try {
      await axiosClient.post('/auth/change-password', {
        user_id: Number(user.id),
        old_password: oldPassword.trim(),
        new_password: newPassword.trim(),
      });
      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordErrors({});
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err?.response?.data?.detail || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const resetPasswordForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordErrors({});
    setPasswordError('');
    setPasswordSuccess(false);
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };
  
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar 
        userName={userName} 
        userRole={userRole} 
        onLogout={handleLogout}
      />
      
      <div className="flex">
        <Sidebar userRole={userRole} currentScreen="settings" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className={`text-4xl mb-6 ${isDarkMode ? 'text-white' : ''}`}>Settings</h1>
            
            {/* App Settings */}
            <Card className={`shadow-md mb-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
              <CardHeader>
                <CardTitle className={isDarkMode ? 'text-white' : ''}>App Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? <Moon className="w-5 h-5 text-gray-300" /> : <Sun className="w-5 h-5 text-gray-600" />}
                    <div>
                      <Label className={isDarkMode ? 'text-white' : ''}>Dark Mode</Label>
                      <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Toggle dark/light theme</p>
                    </div>
                  </div>
                  <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
                </div>
              </CardContent>
            </Card>
            
            {/* Account */}
            <Card className={`shadow-md mb-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
              <CardHeader>
                <CardTitle className={isDarkMode ? 'text-white' : ''}>Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className={`w-full justify-start ${isDarkMode ? 'border-gray-600 text-white hover:bg-gray-700' : ''}`}
                  onClick={() => { resetPasswordForm(); setShowChangePassword(true); }}
                >
                  <Lock className="w-5 h-5 mr-3" />
                  Change Password
                </Button>
                
                <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                  <AlertTriangle className="w-5 h-5 mr-3" />
                  Delete Account
                </Button>
              </CardContent>
            </Card>
            
            {/* Help & Support */}
            <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
              <CardHeader>
                <CardTitle className={isDarkMode ? 'text-white' : ''}>Help & Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className={`w-full justify-start ${isDarkMode ? 'border-gray-600 text-white hover:bg-gray-700' : ''}`}>
                  <HelpCircle className="w-5 h-5 mr-3" />
                  FAQs
                </Button>
                
                <Button variant="outline" className={`w-full justify-start ${isDarkMode ? 'border-gray-600 text-white hover:bg-gray-700' : ''}`}>
                  <Mail className="w-5 h-5 mr-3" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowChangePassword(false)}
        >
          <div
            className={`rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'fadeInUp 0.25s ease-out' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Change Password
                </h2>
              </div>
              <button
                onClick={() => setShowChangePassword(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordSuccess && (
              <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-700 font-medium">Password changed successfully!</p>
              </div>
            )}

            {passwordError && (
              <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <p className="text-red-700 font-medium">{passwordError}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Current Password */}
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    className={`w-full h-11 px-4 pr-11 rounded-xl text-sm outline-none transition-all border ${
                      passwordErrors.oldPassword
                        ? 'border-red-400'
                        : isDarkMode
                        ? 'border-gray-600 bg-gray-700 text-white placeholder:text-gray-400 focus:border-indigo-500'
                        : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-300 focus:border-indigo-500'
                    }`}
                  />
                  <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.oldPassword && <p className="text-red-500 text-xs mt-1 font-medium">{passwordErrors.oldPassword}</p>}
              </div>

              {/* New Password */}
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 chars, uppercase, number, symbol"
                    className={`w-full h-11 px-4 pr-11 rounded-xl text-sm outline-none transition-all border ${
                      passwordErrors.newPassword
                        ? 'border-red-400'
                        : isDarkMode
                        ? 'border-gray-600 bg-gray-700 text-white placeholder:text-gray-400 focus:border-indigo-500'
                        : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-300 focus:border-indigo-500'
                    }`}
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.newPassword && <p className="text-red-500 text-xs mt-1 font-medium">{passwordErrors.newPassword}</p>}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className={`w-full h-11 px-4 pr-11 rounded-xl text-sm outline-none transition-all border ${
                      passwordErrors.confirmNewPassword
                        ? 'border-red-400'
                        : isDarkMode
                        ? 'border-gray-600 bg-gray-700 text-white placeholder:text-gray-400 focus:border-indigo-500'
                        : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-300 focus:border-indigo-500'
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.confirmNewPassword && <p className="text-red-500 text-xs mt-1 font-medium">{passwordErrors.confirmNewPassword}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowChangePassword(false)}
                  className={`flex-1 ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}`}
                >
                  Cancel
                </Button>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="flex-1 h-10 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.97]"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(16px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Ban, CheckCircle, Users, Loader2 } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';
import axiosClient from '../../api/axiosClient';

interface UserManagementProps {
  onNavigate: (screen: string) => void;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function UserManagement({ onNavigate }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/admin/students');
      setUsers(response.data.students || response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await axiosClient.patch(`/admin/users/${userId}/status`, {
        is_active: !currentStatus
      });
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && user.is_active) ||
                          (statusFilter === 'suspended' && !user.is_active);
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole="admin" onLogout={handleLogout} />
      
      <div className="flex">
        <Sidebar userRole="admin" currentScreen="user-management" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className={`text-4xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Manage Students
            </h1>
            
            {/* Filters */}
            <Card className={`shadow-md mb-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`pl-10 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className={isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            {/* Users Table */}
            <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className={`ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Loading students...
                    </span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className={`text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      No students found
                    </p>
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Try adjusting your filters'
                        : 'Students will appear here once registered'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map(user => (
                      <div 
                        key={user.id} 
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isDarkMode 
                            ? 'bg-gray-700/50 border-gray-600' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex flex-1 items-center gap-4">
                          <div className="min-w-[140px] flex-shrink-0">
                            <p className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {user.full_name}
                            </p>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className={`truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {user.email}
                            </p>
                          </div>
                          
                          <div className="flex-shrink-0">
                            <span className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                              user.is_active 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {user.is_active ? 'Active' : 'Suspended'}
                            </span>
                          </div>
                          
                          <div className={`flex-shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {user.created_at ? formatDate(user.created_at) : 'N/A'}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                            className={user.is_active 
                              ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' 
                              : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                            }
                          >
                            {user.is_active ? (
                              <>
                                <Ban className="w-4 h-4 mr-1" />
                                Suspend
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

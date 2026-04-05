import { useNavigate } from 'react-router-dom';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Users, BookOpen, ClipboardList, Upload, FileText, BarChart, Bell, TrendingUp } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useUserName } from '../../hooks/useUserName';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface TeacherDashboardProps {
  onNavigate: (screen: string) => void;
}

const studentActivityData = [
  { course: 'OOP', students: 34 },
  { course: 'Calculus', students: 28 },
  { course: 'Physics', students: 22 },
  { course: 'Data Structures', students: 31 },
  { course: 'English', students: 25 },
];

export default function TeacherDashboard({ onNavigate }: TeacherDashboardProps) {
  const userName = useUserName();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/');
    window.location.reload();
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole="teacher" onLogout={handleLogout} />
      
      <div className="flex">
        <Sidebar userRole="teacher" currentScreen="teacher-dashboard" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl mb-2">Welcome back, Sir! 👋</h1>
              <p className="text-xl text-gray-600">Manage your courses and students</p>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 mb-1">Total Students</p>
                      <p className="text-3xl text-indigo-600">120</p>
                    </div>
                    <div className="p-3 bg-indigo-100 rounded-lg">
                      <Users className="w-8 h-8 text-indigo-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 mb-1">Courses Uploaded</p>
                      <p className="text-3xl text-purple-600">8</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <BookOpen className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 mb-1">Pending Assignments</p>
                      <p className="text-3xl text-pink-600">3</p>
                    </div>
                    <div className="p-3 bg-pink-100 rounded-lg">
                      <ClipboardList className="w-8 h-8 text-pink-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 mb-1">Avg. Completion</p>
                      <p className="text-3xl text-green-600">76%</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Student Activity Chart */}
              <Card className="lg:col-span-2 shadow-md">
                <CardHeader>
                  <CardTitle>Student Activity by Course</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={studentActivityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="course" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="students" fill="#6366f1" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Notifications */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-600" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-900 mb-1">"OOP Quiz 2 submitted by 34 students"</p>
                    <p className="text-blue-600">2 hours ago</p>
                  </div>
                  
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-900 mb-1">"New student registered: Ahmed R."</p>
                    <p className="text-green-600">4 hours ago</p>
                  </div>
                  
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-purple-900 mb-1">"Assignment graded: Calculus HW"</p>
                    <p className="text-purple-600">1 day ago</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Quick Actions */}
            <Card className="mt-6 shadow-md">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline"
                    className="h-24 flex-col gap-2 hover:bg-indigo-50 hover:border-indigo-300"
                  >
                    <Upload className="w-8 h-8 text-indigo-600" />
                    <span>Upload Course Material</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="h-24 flex-col gap-2 hover:bg-purple-50 hover:border-purple-300"
                  >
                    <FileText className="w-8 h-8 text-purple-600" />
                    <span>Create Assignment</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="h-24 flex-col gap-2 hover:bg-pink-50 hover:border-pink-300"
                  >
                    <BarChart className="w-8 h-8 text-pink-600" />
                    <span>View Student Reports</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="h-24 flex-col gap-2 hover:bg-blue-50 hover:border-blue-300"
                    onClick={() => onNavigate('course-library')}
                  >
                    <BookOpen className="w-8 h-8 text-blue-600" />
                    <span>Manage Courses</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

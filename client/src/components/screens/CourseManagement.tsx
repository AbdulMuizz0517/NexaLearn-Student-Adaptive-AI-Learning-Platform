import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { BookOpen, Edit, Trash2, Eye, Search, Users } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';

interface CourseManagementProps {
  onNavigate: (screen: string) => void;
}

const courses = [
  { id: 1, title: 'Data Structures', lessons: 10, students: 45, status: 'Active' },
  { id: 2, title: 'Discrete Mathematics', lessons: 14, students: 65, status: 'Active' },
  { id: 3, title: 'Object Oriented Programming', lessons: 12, students: 52, status: 'Active' },
  { id: 4, title: 'Database Systems', lessons: 16, students: 38, status: 'Active' },
  { id: 5, title: 'Web Development', lessons: 20, students: 72, status: 'Draft' },
];

export default function CourseManagement({ onNavigate }: CourseManagementProps) {
  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole="teacher" onLogout={handleLogout} />
      
      <div className="flex">
        <Sidebar userRole="teacher" currentScreen="course-management" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-4xl">Manage Courses</h1>
              <Button 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                onClick={() => onNavigate('upload-material')}
              >
                Create New Course
              </Button>
            </div>
            
            {/* Search */}
            <Card className="shadow-md mb-6">
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search courses..."
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Courses List */}
            <div className="space-y-4">
              {courses.map(course => (
                <Card key={course.id} className="shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-4 bg-indigo-100 rounded-lg">
                          <BookOpen className="w-8 h-8 text-indigo-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl">{course.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              course.status === 'Active' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {course.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-6 text-gray-600">
                            <span className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              {course.lessons} Lessons
                            </span>
                            <span className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {course.students} Students Enrolled
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

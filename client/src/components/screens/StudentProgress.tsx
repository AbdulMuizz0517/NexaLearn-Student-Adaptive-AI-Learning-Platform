import { useState } from 'react';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';

interface StudentProgressProps {
  onNavigate: (screen: string, data?: any) => void;
}

const students = [
  { id: 1, name: 'Ahmed Raza', course: 'OOP', progress: 76, lastActive: 'Today', trend: 'up' },
  { id: 2, name: 'Fatima Khan', course: 'OOP', progress: 92, lastActive: 'Today', trend: 'up' },
  { id: 3, name: 'Ali Hassan', course: 'Data Structures', progress: 64, lastActive: 'Yesterday', trend: 'down' },
  { id: 4, name: 'Sara Ahmed', course: 'OOP', progress: 88, lastActive: 'Today', trend: 'up' },
  { id: 5, name: 'Usman Tariq', course: 'Database Systems', progress: 45, lastActive: '2 days ago', trend: 'down' },
  { id: 6, name: 'Ayesha Malik', course: 'OOP', progress: 95, lastActive: 'Today', trend: 'up' },
];

export default function StudentProgress({ onNavigate }: StudentProgressProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [performanceFilter, setPerformanceFilter] = useState('all');

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = courseFilter === 'all' || student.course === courseFilter;
    const matchesPerformance = 
      performanceFilter === 'all' || 
      (performanceFilter === 'high' && student.progress >= 80) ||
      (performanceFilter === 'medium' && student.progress >= 60 && student.progress < 80) ||
      (performanceFilter === 'low' && student.progress < 60);
    
    return matchesSearch && matchesCourse && matchesPerformance;
  });

  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole="teacher" onLogout={handleLogout} />
      
      <div className="flex">
        <Sidebar userRole="teacher" currentScreen="student-progress" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl mb-6">Student Progress</h1>
            
            {/* Filters */}
            <Card className="shadow-md mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Search student..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={courseFilter} onValueChange={setCourseFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      <SelectItem value="OOP">Object Oriented Programming</SelectItem>
                      <SelectItem value="Data Structures">Data Structures</SelectItem>
                      <SelectItem value="Database Systems">Database Systems</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by performance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Performance</SelectItem>
                      <SelectItem value="high">High (80%+)</SelectItem>
                      <SelectItem value="medium">Medium (60-79%)</SelectItem>
                      <SelectItem value="low">Low (Below 60%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            {/* Students Table */}
            <Card className="shadow-md">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {filteredStudents.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-white transition-all">
                      <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                        <div>
                          <p className="text-lg text-gray-900">{student.name}</p>
                        </div>
                        
                        <div>
                          <p className="text-gray-600">{student.course}</p>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="flex justify-between mb-1">
                                <span className="text-gray-600">Progress</span>
                                <span className={`${
                                  student.progress >= 80 ? 'text-green-600' :
                                  student.progress >= 60 ? 'text-amber-600' :
                                  'text-red-600'
                                }`}>
                                  {student.progress}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    student.progress >= 80 ? 'bg-green-600' :
                                    student.progress >= 60 ? 'bg-amber-600' :
                                    'bg-red-600'
                                  }`}
                                  style={{ width: `${student.progress}%` }}
                                ></div>
                              </div>
                            </div>
                            {student.trend === 'up' ? (
                              <TrendingUp className="w-5 h-5 text-green-600" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-gray-600">Last Active</p>
                          <p className="text-gray-900">{student.lastActive}</p>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => onNavigate('student-report', { student })}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
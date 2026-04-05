import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';

interface AssignmentsListProps {
  onNavigate: (screen: string, data?: any) => void;
  userRole: 'student' | 'teacher' | 'admin' | null;
}

const pendingAssignments = [
  { id: 1, title: 'OOP Assignment 1', course: 'Object Oriented Programming', dueDate: '12 Nov, 11:59 PM', status: 'Pending' },
  { id: 2, title: 'Physics Problem Set', course: 'Quantum Physics', dueDate: '14 Nov, 11:59 PM', status: 'Pending' },
  { id: 3, title: 'Calculus Derivatives', course: 'Calculus Fundamentals', dueDate: '16 Nov, 11:59 PM', status: 'Pending' },
];

const submittedAssignments = [
  { id: 4, title: 'Math Algebra Worksheet', course: 'Linear Algebra', dueDate: '15 Nov', status: 'Submitted', submittedOn: '13 Nov, 9:30 PM' },
  { id: 5, title: 'Data Structures HW', course: 'Data Structures', dueDate: '10 Nov', status: 'Submitted', submittedOn: '9 Nov, 8:15 PM' },
];

const gradedAssignments = [
  { id: 6, title: 'English Essay', course: 'English Literature', dueDate: '5 Nov', status: 'Graded', score: '85/100', grade: 'A' },
  { id: 7, title: 'OOP Quiz Corrections', course: 'Object Oriented Programming', dueDate: '3 Nov', status: 'Graded', score: '92/100', grade: 'A+' },
  { id: 8, title: 'Physics Lab Report', course: 'Quantum Physics', dueDate: '1 Nov', status: 'Graded', score: '78/100', grade: 'B+' },
];

export default function AssignmentsList({ onNavigate, userRole }: AssignmentsListProps) {
  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole={userRole} onLogout={handleLogout} />
      
      <div className="flex">
        <Sidebar userRole={userRole || 'student'} currentScreen="assignments-list" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl mb-6">Assignments</h1>
            
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="submitted">Submitted</TabsTrigger>
                <TabsTrigger value="graded">Graded</TabsTrigger>
              </TabsList>
              
              {/* Pending Tab */}
              <TabsContent value="pending">
                <div className="space-y-4">
                  {pendingAssignments.map((assignment) => (
                    <Card key={assignment.id} className="shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4 flex-1">
                            <div className="p-3 bg-amber-100 rounded-lg h-fit">
                              <AlertCircle className="w-6 h-6 text-amber-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl mb-2">{assignment.title}</h3>
                              <p className="text-gray-600 mb-3">{assignment.course}</p>
                              <div className="flex items-center gap-2 text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>Due: {assignment.dueDate}</span>
                              </div>
                              <div className="mt-3 inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full">
                                {assignment.status}
                              </div>
                            </div>
                          </div>
                          <Button 
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                            onClick={() => onNavigate('assignment-detail', { assignment })}
                          >
                            View / Submit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              {/* Submitted Tab */}
              <TabsContent value="submitted">
                <div className="space-y-4">
                  {submittedAssignments.map((assignment) => (
                    <Card key={assignment.id} className="shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4 flex-1">
                            <div className="p-3 bg-blue-100 rounded-lg h-fit">
                              <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl mb-2">{assignment.title}</h3>
                              <p className="text-gray-600 mb-3">{assignment.course}</p>
                              <div className="flex items-center gap-4 text-gray-500 mb-3">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>Due: {assignment.dueDate}</span>
                                </div>
                                <span>•</span>
                                <span>Submitted: {assignment.submittedOn}</span>
                              </div>
                              <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                                {assignment.status}
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="outline"
                            onClick={() => onNavigate('assignment-detail', { assignment })}
                          >
                            View Submission
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              {/* Graded Tab */}
              <TabsContent value="graded">
                <div className="space-y-4">
                  {gradedAssignments.map((assignment) => (
                    <Card key={assignment.id} className="shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4 flex-1">
                            <div className="p-3 bg-green-100 rounded-lg h-fit">
                              <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl mb-2">{assignment.title}</h3>
                              <p className="text-gray-600 mb-3">{assignment.course}</p>
                              <div className="flex items-center gap-4 mb-3">
                                <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                                  Score: {assignment.score}
                                </div>
                                <div className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg">
                                  Grade: {assignment.grade}
                                </div>
                              </div>
                              <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full">
                                {assignment.status}
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="outline"
                            onClick={() => onNavigate('assignment-detail', { assignment })}
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

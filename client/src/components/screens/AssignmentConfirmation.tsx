import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { CheckCircle, FileText, Calendar, Eye } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';

interface AssignmentConfirmationProps {
  assignment?: any;
  onNavigate: (screen: string) => void;
  userRole: 'student' | 'teacher' | 'admin' | null;
}

export default function AssignmentConfirmation({ assignment, onNavigate, userRole }: AssignmentConfirmationProps) {
  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole={userRole} onLogout={handleLogout} />
      
      <div className="flex">
        <Sidebar userRole={userRole || 'student'} currentScreen="assignments-list" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="max-w-2xl w-full">
            {/* Success Icon */}
            <div className="text-center mb-8">
              <div className="inline-flex p-6 bg-green-100 rounded-full mb-6">
                <CheckCircle className="w-24 h-24 text-green-600" />
              </div>
              <h1 className="text-4xl mb-3">Assignment Submitted!</h1>
              <p className="text-xl text-gray-600">Your submission for OOP Assignment 1 has been received.</p>
            </div>
            
            {/* Submission Details */}
            <Card className="shadow-lg mb-6">
              <CardContent className="pt-6">
                <h2 className="text-2xl mb-6">Submission Details</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="p-3 bg-indigo-100 rounded-lg">
                      <Calendar className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-gray-600">Submitted on</p>
                      <p className="text-gray-900">10 Nov, 8:42 PM</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <FileText className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-gray-600">File submitted</p>
                      <p className="text-gray-900">oop_assignment.py</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Info Card */}
            <Card className="shadow-lg mb-6 bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-blue-900">
                  Your instructor will review your submission and provide feedback. You'll be notified once your assignment has been graded.
                </p>
              </CardContent>
            </Card>
            
            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => onNavigate('assignment-detail')}
              >
                <Eye className="w-5 h-5 mr-2" />
                View Submission
              </Button>
              
              <Button 
                size="lg"
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                onClick={() => onNavigate('assignments-list')}
              >
                Back to Assignments
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

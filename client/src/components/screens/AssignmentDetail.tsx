import { useState } from 'react';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { ArrowLeft, Download, Upload, FileText, Save } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';

interface AssignmentDetailProps {
  assignment?: any;
  onNavigate: (screen: string, data?: any) => void;
  userRole: 'student' | 'teacher' | 'admin' | null;
}

export default function AssignmentDetail({ assignment, onNavigate, userRole }: AssignmentDetailProps) {
  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0].name);
    }
  };

  const handleSubmit = () => {
    onNavigate('assignment-confirmation', { assignment });
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole={userRole} onLogout={handleLogout} />
      
      <div className="flex">
        <Sidebar userRole={userRole || 'student'} currentScreen="assignments-list" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Button variant="ghost" onClick={() => onNavigate('assignments-list')} className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assignments
            </Button>
            
            {/* Assignment Header */}
            <div className="mb-6">
              <h1 className="text-4xl mb-3">OOP Assignment 1</h1>
              <p className="text-xl text-gray-600">Object Oriented Programming</p>
              <div className="flex gap-4 mt-3 text-gray-600">
                <span>Due: 12 Nov, 11:59 PM</span>
                <span>•</span>
                <span>Max Score: 100 points</span>
              </div>
            </div>
            
            {/* Description */}
            <Card className="shadow-md mb-6">
              <CardContent className="pt-6">
                <h2 className="text-2xl mb-4">Description</h2>
                <p className="text-gray-700 mb-4">
                  Write a short program demonstrating the use of classes and objects. Your program should include:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>At least two different classes with appropriate attributes and methods</li>
                  <li>Demonstration of inheritance or composition</li>
                  <li>Proper encapsulation using access modifiers</li>
                  <li>Comments explaining your code</li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Attached Files */}
            <Card className="shadow-md mb-6">
              <CardContent className="pt-6">
                <h2 className="text-2xl mb-4">Attached Files</h2>
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <FileText className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-gray-900">assignment.pdf</p>
                      <p className="text-gray-500">245 KB</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Submission Section */}
            <Card className="shadow-md mb-6">
              <CardContent className="pt-6">
                <h2 className="text-2xl mb-4">Submission</h2>
                
                <div className="mb-6">
                  <label className="block mb-2 text-gray-700">Upload your solution:</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-gray-50">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      {uploadedFile ? (
                        <div>
                          <p className="text-green-600 mb-1">✓ File uploaded</p>
                          <p className="text-gray-600">{uploadedFile}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-600 mb-1">Click to upload or drag and drop</p>
                          <p className="text-gray-500">PDF, DOC, DOCX, or code files</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block mb-2 text-gray-700">Add notes or comments (Optional):</label>
                  <Textarea
                    placeholder="Add any additional notes about your submission..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-32"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                variant="outline"
                size="lg"
                className="flex-1"
              >
                <Save className="w-5 h-5 mr-2" />
                Save Draft
              </Button>
              
              <Button 
                onClick={handleSubmit}
                size="lg"
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                disabled={!uploadedFile}
              >
                Submit Assignment
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

import { useState } from 'react';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Upload, Save } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';

interface CreateAssignmentProps {
  onNavigate: (screen: string) => void;
}

export default function CreateAssignment({ onNavigate }: CreateAssignmentProps) {
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0].name);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole="teacher" onLogout={handleLogout} />
      
      <div className="flex">
        <Sidebar userRole="teacher" currentScreen="create-assignment" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl mb-6">Create New Assignment</h1>
            
            <Card className="shadow-md">
              <CardContent className="pt-6">
                <form className="space-y-6">
                  <div>
                    <Label htmlFor="assignmentTitle">Assignment Title</Label>
                    <Input
                      id="assignmentTitle"
                      placeholder="e.g., OOP Assignment 1"
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="course">Course</Label>
                    <Select>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oop">Object Oriented Programming</SelectItem>
                        <SelectItem value="ds">Data Structures</SelectItem>
                        <SelectItem value="db">Database Systems</SelectItem>
                        <SelectItem value="web">Web Development</SelectItem>
                        <SelectItem value="math">Discrete Mathematics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Provide detailed instructions for the assignment..."
                      className="mt-2 min-h-40"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="attachFile">Attach File (optional)</Label>
                    <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-gray-50">
                      <input
                        type="file"
                        id="attachFile"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <label htmlFor="attachFile" className="cursor-pointer">
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        {uploadedFile ? (
                          <div>
                            <p className="text-green-600 mb-1">✓ File attached</p>
                            <p className="text-gray-600">{uploadedFile}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-gray-600 mb-1">Click to upload or drag and drop</p>
                            <p className="text-gray-500">PDF, DOC, or any relevant files</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        className="mt-2"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="dueTime">Due Time</Label>
                      <Input
                        id="dueTime"
                        type="time"
                        className="mt-2"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="maxScore">Max Score</Label>
                    <Input
                      id="maxScore"
                      type="number"
                      placeholder="100"
                      className="mt-2"
                    />
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
                onClick={() => onNavigate('teacher-dashboard')}
              >
                Cancel
              </Button>
              
              <Button 
                size="lg"
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Save className="w-5 h-5 mr-2" />
                Create Assignment
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

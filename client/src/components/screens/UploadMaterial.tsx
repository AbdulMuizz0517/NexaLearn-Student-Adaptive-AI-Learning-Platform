import { useState } from 'react';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Upload, FileText, Video, Book, Save } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';

interface UploadMaterialProps {
  onNavigate: (screen: string) => void;
}

export default function UploadMaterial({ onNavigate }: UploadMaterialProps) {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [useAI, setUseAI] = useState({
    summary: true,
    keywords: true
  });
  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileNames = Array.from(e.target.files).map(file => file.name);
      setUploadedFiles([...uploadedFiles, ...fileNames]);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole="teacher" onLogout={handleLogout} />
      
      <div className="flex">
        <Sidebar userRole="teacher" currentScreen="upload-material" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl mb-6">Upload Course Material</h1>
            
            <Card className="shadow-md mb-6">
              <CardContent className="pt-6">
                <form className="space-y-6">
                  <div>
                    <Label htmlFor="courseTitle">Course Title</Label>
                    <Input
                      id="courseTitle"
                      placeholder="e.g., Advanced Object Oriented Programming"
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Provide a brief description of the course material..."
                      className="mt-2 min-h-32"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cs">Computer Science</SelectItem>
                        <SelectItem value="math">Mathematics</SelectItem>
                        <SelectItem value="physics">Physics</SelectItem>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </form>
              </CardContent>
            </Card>
            
            {/* Upload Content */}
            <Card className="shadow-md mb-6">
              <CardContent className="pt-6">
                <h2 className="text-2xl mb-4">Upload Content</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-indigo-400 transition-colors cursor-pointer bg-gray-50">
                    <input
                      type="file"
                      id="pdf-upload"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      <FileText className="w-12 h-12 text-red-500 mx-auto mb-3" />
                      <p className="text-gray-900 mb-1">PDF</p>
                      <p className="text-gray-500">Upload PDF files</p>
                    </label>
                  </div>
                  
                  <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-indigo-400 transition-colors cursor-pointer bg-gray-50">
                    <input
                      type="file"
                      id="video-upload"
                      className="hidden"
                      accept="video/*"
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="video-upload" className="cursor-pointer">
                      <Video className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                      <p className="text-gray-900 mb-1">Video</p>
                      <p className="text-gray-500">Upload video files</p>
                    </label>
                  </div>
                  
                  <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-indigo-400 transition-colors cursor-pointer bg-gray-50">
                    <input
                      type="file"
                      id="notes-upload"
                      className="hidden"
                      accept=".doc,.docx,.txt"
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="notes-upload" className="cursor-pointer">
                      <Book className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-gray-900 mb-1">Notes</p>
                      <p className="text-gray-500">Upload text files</p>
                    </label>
                  </div>
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="mb-6">
                    <h3 className="mb-3">Uploaded Files:</h3>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <Upload className="w-5 h-5 text-green-600" />
                          <span className="text-green-900">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* AI Options */}
            <Card className="shadow-md mb-6">
              <CardContent className="pt-6">
                <h2 className="text-2xl mb-4">AI Enhancement Options</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="summary" 
                      checked={useAI.summary}
                      onCheckedChange={(checked) => setUseAI({ ...useAI, summary: checked as boolean })}
                    />
                    <Label htmlFor="summary" className="cursor-pointer">
                      Generate Summary Using AI
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="keywords" 
                      checked={useAI.keywords}
                      onCheckedChange={(checked) => setUseAI({ ...useAI, keywords: checked as boolean })}
                    />
                    <Label htmlFor="keywords" className="cursor-pointer">
                      Extract Keywords & Learning Points
                    </Label>
                  </div>
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
                Save as Draft
              </Button>
              
              <Button 
                size="lg"
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

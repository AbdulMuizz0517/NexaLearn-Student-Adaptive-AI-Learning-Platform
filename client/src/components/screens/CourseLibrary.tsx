import { useState, useEffect } from 'react';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BookOpen, Play, Code, Loader2 } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axiosClient from '../../api/axiosClient';

interface CourseLibraryProps {
  onSelectCourse: (course: any) => void;
  onBack: () => void;
  onNavigate: (screen: string) => void;
  userRole: 'student' | 'teacher' | 'admin' | null;
}

interface LearningPathData {
  id: number;
  topic: string;
  generated_content: {
    title: string;
    difficulty?: string;
    chapters: { title: string; subchapters: string[] }[];
  } | string;
}

// Programming languages available for learning
const availableLanguages = [
  { id: 'python', name: 'Python', icon: '🐍', description: 'Great for beginners and AI/ML' },
  { id: 'javascript', name: 'JavaScript', icon: '🌐', description: 'Web development essential' },
  { id: 'java', name: 'Java', icon: '☕', description: 'Enterprise and Android development' },
  { id: 'cpp', name: 'C++', icon: '⚡', description: 'System programming and games' },
  { id: 'csharp', name: 'C#', icon: '🎮', description: 'Game development with Unity' },
  { id: 'rust', name: 'Rust', icon: '🦀', description: 'Safe systems programming' },
];

export default function CourseLibrary({ onSelectCourse, onBack, onNavigate, userRole }: CourseLibraryProps) {
  const userName = useUserName();
  const handleLogout = useLogout();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [learningPaths, setLearningPaths] = useState<LearningPathData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchPaths = async () => {
      try {
        setLoading(true);
        const response = await axiosClient.get<LearningPathData[]>(`/path/${user.id}`);
        setLearningPaths(response.data || []);
      } catch (error) {
        console.error('Failed to fetch learning paths:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaths();
  }, [user?.id]);

  const parseContent = (path: LearningPathData) => {
    if (typeof path.generated_content === 'string') {
      try {
        return JSON.parse(path.generated_content);
      } catch {
        return null;
      }
    }
    return path.generated_content;
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole={userRole} onLogout={handleLogout} />
      
      <div className="flex">
        {userRole && <Sidebar userRole={userRole} currentScreen="course-library" onNavigate={onNavigate} />}
        
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className={`text-4xl mb-2 ${isDarkMode ? 'text-white' : ''}`}>My Courses</h1>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Your personalized learning paths</p>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="ml-3 text-gray-600">Loading your courses...</span>
              </div>
            ) : learningPaths.length > 0 ? (
              <>
                <h2 className="text-2xl mb-4">Your Learning Paths</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {learningPaths.map(path => {
                    const content = parseContent(path);
                    return (
                      <Card key={path.id} className="shadow-md hover:shadow-xl transition-shadow">
                        <CardHeader>
                          <CardTitle className="flex items-start gap-3">
                            <div className="p-3 bg-indigo-100 rounded-lg shrink-0">
                              <Code className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="mb-1">{content?.title || path.topic}</h3>
                              <p className="text-gray-600 text-sm capitalize">
                                {content?.difficulty || 'Beginner'} Level
                              </p>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4 text-gray-600 mb-4">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              {content?.chapters?.length || 0} Chapters
                            </span>
                          </div>
                          
                          <Button 
                            onClick={() => onSelectCourse({ ...path, content })}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Continue & Open Notes
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            ) : (
              <Card className="shadow-md mb-8">
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl mb-2">No courses yet</h3>
                    <p className="mb-4">Take a quiz to get your personalized learning path!</p>
                    <Button 
                      onClick={() => onBack()}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600"
                    >
                      Go to Quizzes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Available Languages Section */}
            <h2 className="text-2xl mb-4">Available Programming Languages</h2>
            <p className="text-gray-600 mb-4">Take a quiz in any of these languages to start learning</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableLanguages.map(lang => (
                <Card key={lang.id} className="shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-indigo-200">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{lang.icon}</span>
                      <div>
                        <h4 className="font-semibold">{lang.name}</h4>
                        <p className="text-sm text-gray-500">{lang.description}</p>
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

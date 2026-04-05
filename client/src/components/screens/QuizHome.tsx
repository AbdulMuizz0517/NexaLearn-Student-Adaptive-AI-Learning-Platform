import { useState } from 'react';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Clock, Target, Award, Code, ChevronRight } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';

interface QuizHomeProps {
  onStart: (language: string) => void;
  onBack: () => void;
  onNavigate: (screen: string) => void;
  userRole: 'student' | 'teacher' | 'admin' | null;
}

const programmingLanguages = [
  { id: 'python', name: 'Python', icon: '🐍', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'javascript', name: 'JavaScript', icon: '🌐', color: 'bg-amber-100 border-amber-300' },
  { id: 'java', name: 'Java', icon: '☕', color: 'bg-orange-100 border-orange-300' },
  { id: 'cpp', name: 'C++', icon: '⚡', color: 'bg-blue-100 border-blue-300' },
  { id: 'csharp', name: 'C#', icon: '🎮', color: 'bg-purple-100 border-purple-300' },
  { id: 'rust', name: 'Rust', icon: '🦀', color: 'bg-red-100 border-red-300' },
];

export default function QuizHome({ onStart, onBack, onNavigate, userRole }: QuizHomeProps) {
  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const selectedLang = programmingLanguages.find(l => l.id === selectedLanguage);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole={userRole} onLogout={handleLogout} />
      
      <div className="flex">
        {userRole && <Sidebar userRole={userRole} currentScreen="quiz-home" onNavigate={onNavigate} />}
        
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className={`text-4xl mb-3 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Programming Quiz</h1>
              <p className={`text-xl ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Test your knowledge and get a personalized learning path</p>
            </div>

            {/* Continue Ongoing Course */}
            <Card className={`shadow-lg mb-6 border-2 border-indigo-200 ${isDarkMode ? 'bg-gray-800 border-indigo-700' : 'bg-gradient-to-r from-indigo-50 to-purple-50'}`}>
              <CardContent className="pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>📚 Continue Your Courses</h2>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Resume an ongoing course or learning path</p>
                  </div>
                  <Button
                    onClick={() => onNavigate('course-library')}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                  >
                    My Courses
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Language Selection */}
            <Card className={`shadow-lg mb-8 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
              <CardContent className="pt-6">
                <h2 className={`text-2xl mb-4 flex items-center gap-2 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Code className="w-6 h-6 text-indigo-600" />
                  Choose Your Programming Language
                </h2>
                <p className="text-gray-600 mb-4">Select the language you want to be quizzed on:</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {programmingLanguages.map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => setSelectedLanguage(lang.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedLanguage === lang.id
                          ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                          : `${lang.color} hover:border-indigo-400`
                      }`}
                    >
                      <span className="text-3xl mb-2 block">{lang.icon}</span>
                      <span className="font-semibold text-gray-900">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Quiz Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="inline-flex p-4 bg-indigo-100 rounded-full mb-4">
                      <Target className="w-8 h-8 text-indigo-600" />
                    </div>
                    <p className="text-gray-600 mb-1">Questions</p>
                    <p className="text-3xl text-indigo-600">10</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="inline-flex p-4 bg-purple-100 rounded-full mb-4">
                      <Clock className="w-8 h-8 text-purple-600" />
                    </div>
                    <p className="text-gray-600 mb-1">Time Limit</p>
                    <p className="text-3xl text-purple-600">25 min</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="inline-flex p-4 bg-pink-100 rounded-full mb-4">
                      <Award className="w-8 h-8 text-pink-600" />
                    </div>
                    <p className="text-gray-600 mb-1">Result</p>
                    <p className="text-xl text-pink-600">Learning Path</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Instructions */}
            <Card className="shadow-lg mb-8">
              <CardContent className="pt-6">
                <h2 className={`text-2xl mb-4 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>How It Works</h2>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-3">
                    <span className="text-indigo-600 mt-1">1.</span>
                    <span>Answer 10 adaptive coding questions about your chosen language</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-indigo-600 mt-1">2.</span>
                    <span>Based on your score, we'll determine your skill level (Beginner/Intermediate/Advanced)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-indigo-600 mt-1">3.</span>
                    <span>Get a personalized learning path tailored to your level</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-indigo-600 mt-1">4.</span>
                    <span>Access your learning path in "My Courses" section</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Button 
              onClick={() => selectedLanguage && onStart(selectedLanguage)}
              disabled={!selectedLanguage}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
              size="lg"
            >
              {selectedLanguage ? (
                <>
                  Start {selectedLang?.name} Quiz
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              ) : (
                'Select a Language to Continue'
              )}
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}

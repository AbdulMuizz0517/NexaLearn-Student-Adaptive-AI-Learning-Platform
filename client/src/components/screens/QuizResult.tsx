import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Trophy, CheckCircle, XCircle, RotateCcw, Home } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';

interface QuizResultProps {
  answers: number[];
  onRetake: () => void;
  onBack: () => void;
  onNavigate: (screen: string) => void;
  userRole: 'student' | 'teacher' | 'admin' | null;
}

export default function QuizResult({ answers, onRetake, onBack, onNavigate, userRole }: QuizResultProps) {
  // Calculate real results from answers (1 = correct, 0 = wrong)
  const totalQuestions = answers.length || 10;
  const correctAnswers = answers.reduce((sum, val) => sum + val, 0);
  const wrongAnswers = totalQuestions - correctAnswers;
  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  
  // Determine difficulty level based on score
  const getDifficultyLevel = (s: number) => {
    if (s <= 40) return { level: 'Beginner', color: 'green' };
    if (s <= 70) return { level: 'Intermediate', color: 'blue' };
    return { level: 'Advanced', color: 'purple' };
  };
  
  const { level, color } = getDifficultyLevel(score);
  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();
  const difficultyBadgeClass =
    color === 'green' ? 'bg-green-700' : color === 'blue' ? 'bg-blue-700' : 'bg-purple-700';

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole={userRole} onLogout={handleLogout} />
      
      <div className="flex">
        {userRole && <Sidebar userRole={userRole} currentScreen="quiz-home" onNavigate={onNavigate} />}
        
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Result Header */}
            <div className="text-center mb-8">
              <h1 className={`text-4xl mb-3 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Quiz Completed! 🎉</h1>
              <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Here's how you performed</p>
            </div>
            
            {/* Score Card */}
            <Card className="shadow-xl overflow-hidden mb-8 border-2 border-indigo-500">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-12 text-white text-center">
                <div className="mb-6 flex justify-center">
                  <div className="p-6 bg-white/20 rounded-full backdrop-blur-sm">
                    <Trophy className="w-20 h-20" />
                  </div>
                </div>
                <p className="text-2xl mb-3 opacity-90">Your Score</p>
                <p className="text-7xl mb-4">{score}%</p>
                <p className="text-3xl mb-2">{correctAnswers}/{totalQuestions} Correct</p>
                <div className={`inline-block px-6 py-3 rounded-full text-xl mt-4 ${difficultyBadgeClass}`}>
                  {level} Level Path Created
                </div>
              </div>
            </Card>
            
            {/* Detailed Breakdown */}
            <Card className="shadow-lg mb-8">
              <CardContent className="pt-6">
                <h2 className={`text-2xl mb-6 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Detailed Breakdown</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg text-center">
                    <div className="inline-flex p-3 bg-green-100 rounded-full mb-3">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-gray-600 mb-1">Correct Answers</p>
                    <p className="text-4xl text-green-600">{correctAnswers}</p>
                  </div>
                  
                  <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg text-center">
                    <div className="inline-flex p-3 bg-red-100 rounded-full mb-3">
                      <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <p className="text-gray-600 mb-1">Wrong Answers</p>
                    <p className="text-4xl text-red-600">{wrongAnswers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Learning Path Info */}
            <Card className="shadow-lg mb-8">
              <CardContent className="pt-6">
                <h2 className={`text-2xl mb-4 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Your Learning Path</h2>
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <p className="text-indigo-900">
                    Based on your score, a <strong>{level}</strong> learning path has been generated for you. 
                    Visit <strong>"My Courses"</strong> to start learning!
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline"
                size="lg"
                onClick={onRetake}
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Take Another Quiz
              </Button>
              
              <Button 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                size="lg"
                onClick={onBack}
              >
                <Home className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

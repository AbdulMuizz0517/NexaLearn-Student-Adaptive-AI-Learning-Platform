import { Button } from '../ui/button';
import { MessageCircle, Calendar, Brain } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface OnboardingWhyProps {
  onNext: () => void;
}

export default function OnboardingWhy({ onNext }: OnboardingWhyProps) {
  const { isDarkMode } = useTheme();
  return (
    <div className={`h-screen flex flex-col justify-between p-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <div className="flex-1 flex flex-col justify-center">
        <h1 className={`text-4xl mb-3 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Learn Smarter, Not Harder</h1>
        
        <div className="mt-12 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg shrink-0">
              <MessageCircle className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-gray-700">AI answers your questions</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 rounded-lg shrink-0">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-700">Personalized study plan</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-pink-100 rounded-lg shrink-0">
              <Brain className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <p className="text-gray-700">Smart quizzes that adapt to you</p>
            </div>
          </div>
        </div>
      </div>
      
      <Button 
        onClick={onNext} 
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        size="lg"
      >
        Next
      </Button>
    </div>
  );
}

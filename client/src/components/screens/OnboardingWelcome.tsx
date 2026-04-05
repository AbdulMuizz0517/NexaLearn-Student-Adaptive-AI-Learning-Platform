import { Button } from '../ui/button';
import { Bot } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface OnboardingWelcomeProps {
  onNext: () => void;
}

export default function OnboardingWelcome({ onNext }: OnboardingWelcomeProps) {
  const { isDarkMode } = useTheme();
  return (
    <div className={`h-screen flex flex-col items-center justify-between p-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="mb-8 p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full">
          <Bot className="w-20 h-20 text-white" />
        </div>
        
        <h1 className={`text-4xl mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Welcome to NexaLearn</h1>
        <p className={`text-xl max-w-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Your personalized AI learning assistant.</p>
      </div>
      
      <Button 
        onClick={onNext} 
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        size="lg"
      >
        Get Started
      </Button>
    </div>
  );
}

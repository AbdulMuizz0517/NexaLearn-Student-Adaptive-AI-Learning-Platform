import { useState, useEffect } from "react";
import { 
  BookOpen, Play, CheckCircle, Lock, ChevronRight, 
  Youtube, FileText, Code, Award, Loader2, ArrowLeft,
  Trophy, Star, Zap
} from "lucide-react";
import NavBar from "../NavBar";
import Sidebar from "../Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

interface LearningPathViewProps {
  pathId: number;
  topic: string;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

interface ChapterProgress {
  id: number;
  chapter_index: number;
  chapter_title: string;
  level1_completed: boolean;
  level2_completed: boolean;
  level3_completed: boolean;
  chapter_quiz_score: number | null;
  chapter_quiz_passed: boolean;
  is_unlocked: boolean;
  resources_generated: boolean;
}

export default function LearningPathView({ pathId, topic, onNavigate, onBack }: LearningPathViewProps) {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const [progress, setProgress] = useState<ChapterProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<ChapterProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userName = user?.full_name || user?.email?.split('@')[0] || 'Student';

  useEffect(() => {
    fetchProgress();
  }, [pathId, user?.id]);

  const fetchProgress = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const response = await axiosClient.get(`/progress/user/${user.id}/path/${pathId}`);
      if (response.data.progress && response.data.progress.length > 0) {
        setProgress(response.data.progress);
      } else {
        // Initialize progress
        await initializeProgress();
      }
    } catch (err: any) {
      console.error("Failed to fetch progress:", err);
      setError(err?.response?.data?.detail || "Failed to load progress");
    } finally {
      setLoading(false);
    }
  };

  const initializeProgress = async () => {
    if (!user?.id) return;
    try {
      setInitializing(true);
      const response = await axiosClient.post("/progress/init", {
        user_id: user.id,
        learning_path_id: pathId
      });
      if (response.data.progress) {
        setProgress(response.data.progress);
      }
    } catch (err: any) {
      console.error("Failed to initialize:", err);
      setError("Failed to initialize progress");
    } finally {
      setInitializing(false);
    }
  };

  const handleStartChapter = (chapter: ChapterProgress) => {
    if (!chapter.is_unlocked) return;
    setSelectedChapter(chapter);
    onNavigate('chapter-learning', { 
      chapterProgress: chapter, 
      topic,
      pathId 
    });
  };

  const completedChapters = progress.filter(p => p.chapter_quiz_passed).length;
  const totalChapters = progress.length;
  const overallProgress = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

  if (loading || initializing) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
            {initializing ? 'Setting up your learning journey...' : 'Loading your progress...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole="student" onLogout={logout} />
      
      <div className="flex">
        <Sidebar userRole="student" currentScreen="learning-path" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <Button 
                variant="ghost" 
                onClick={onBack}
                className={`mb-4 ${isDarkMode ? 'text-gray-300 hover:text-white' : ''}`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className={`text-3xl font-extrabold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {topic.charAt(0).toUpperCase() + topic.slice(1)} Learning Path
                  </h1>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                    Complete each chapter to master {topic.charAt(0).toUpperCase() + topic.slice(1)}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-extrabold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {Math.round(overallProgress)}%
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {completedChapters}/{totalChapters} chapters
                  </p>
                </div>
              </div>
              
              <div className="h-3 mt-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                />
              </div>
            </div>

            {/* Legend */}
            <Card className={`mb-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'border-gray-100 shadow-sm'}`}>
              <CardContent className="py-4">
                <div className="flex flex-wrap gap-5 justify-center">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-md bg-blue-500" />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Level 1: MCQs & Fill Blanks</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-md bg-orange-500" />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Level 2: Complete Code</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-md bg-purple-500" />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Level 3: Write Code</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Chapter Quiz</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chapters */}
            <div className="space-y-4">
              {progress.map((chapter, index) => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  index={index}
                  isDarkMode={isDarkMode}
                  onStart={() => handleStartChapter(chapter)}
                />
              ))}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

interface ChapterCardProps {
  chapter: ChapterProgress;
  index: number;
  isDarkMode: boolean;
  onStart: () => void;
}

function ChapterCard({ chapter, index, isDarkMode, onStart }: ChapterCardProps) {
  const isCompleted = chapter.chapter_quiz_passed;
  const isLocked = !chapter.is_unlocked;
  const levelsCompleted = [chapter.level1_completed, chapter.level2_completed, chapter.level3_completed].filter(Boolean).length;
  const allLevelsDone = levelsCompleted === 3;

  return (
    <Card 
      className={`transition-all duration-200 ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'border-gray-100 shadow-sm'
      } ${
        isLocked ? 'opacity-60' : 'hover:shadow-lg cursor-pointer'
      } ${
        isCompleted ? 'border-green-500 border-2' : ''
      }`}
      onClick={() => !isLocked && onStart()}
    >
      <CardContent className="py-6">
        <div className="flex items-center gap-4">
          {/* Chapter Number */}
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${
            isCompleted 
              ? 'bg-green-500 text-white' 
              : isLocked 
                ? 'bg-gray-300 text-gray-500' 
                : 'bg-indigo-600 text-white'
          }`}>
            {isCompleted ? <CheckCircle className="w-7 h-7" /> : isLocked ? <Lock className="w-6 h-6" /> : index + 1}
          </div>

          {/* Chapter Info */}
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {chapter.chapter_title}
            </h3>
            
            {/* Level Progress */}
            <div className="flex items-center gap-3 mt-2">
              <LevelBadge 
                level={1} 
                completed={chapter.level1_completed} 
                color="blue"
                label="MCQs"
              />
              <LevelBadge 
                level={2} 
                completed={chapter.level2_completed} 
                color="orange"
                label="Complete"
              />
              <LevelBadge 
                level={3} 
                completed={chapter.level3_completed} 
                color="purple"
                label="Write"
              />
              
              {allLevelsDone && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  chapter.chapter_quiz_passed 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  <Trophy className="w-3 h-3" />
                  {chapter.chapter_quiz_passed 
                    ? `Passed (${chapter.chapter_quiz_score}%)` 
                    : 'Quiz Ready'}
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div>
            {isLocked ? (
              <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Complete previous chapter
              </span>
            ) : isCompleted ? (
              <Button variant="outline" size="sm">
                <Star className="w-4 h-4 mr-1 text-yellow-500" />
                Review
              </Button>
            ) : (
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                {levelsCompleted === 0 ? 'Start' : 'Continue'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface LevelBadgeProps {
  level: number;
  completed: boolean;
  color: 'blue' | 'orange' | 'purple';
  label: string;
}

function LevelBadge({ level, completed, color, label }: LevelBadgeProps) {
  const colors = {
    blue: completed ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600 border border-blue-200',
    orange: completed ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600 border border-orange-200',
    purple: completed ? 'bg-purple-500 text-white' : 'bg-purple-50 text-purple-600 border border-purple-200',
  };

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors[color]}`}>
      {completed ? <CheckCircle className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
      L{level}
    </div>
  );
}

import { useState, useEffect } from "react";
import { 
  CheckCircle, Lock, Youtube, FileText, Code, Loader2, ArrowLeft,
  Trophy, ExternalLink, Brain, Pencil, RefreshCw
} from "lucide-react";
import NavBar from "../NavBar";
import Sidebar from "../Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

interface ChapterLearningProps {
  chapterProgress: {
    id: number;
    chapter_index: number;
    chapter_title: string;
    level1_completed: boolean;
    level2_completed: boolean;
    level3_completed: boolean;
    chapter_quiz_passed: boolean;
    is_unlocked: boolean;
  };
  topic: string;
  pathId: number;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

interface AIContent {
  topic: string;
  summary: string;
  key_points: string[];
  next_chapter_preview: string;
  youtube_videos: { title: string; url: string; type: string }[];
}

export default function ChapterLearning({ 
  chapterProgress, 
  topic, 
  pathId,
  onNavigate, 
  onBack 
}: ChapterLearningProps) {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const [aiContent, setAiContent] = useState<AIContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [progress, setProgress] = useState(chapterProgress);

  const userName = user?.full_name || user?.email?.split('@')[0] || 'Student';

  useEffect(() => {
    const loadInitialData = async () => {
      const latestProgress = await fetchProgress();
      fetchAIContent(latestProgress || chapterProgress);
    };
    loadInitialData();
  }, [chapterProgress.id]);

  const fetchProgress = async () => {
    if (!user?.id) return;
    try {
      // Fetch fresh progress from server
      const response = await axiosClient.get(`/progress/user/${user.id}/path/${pathId}`);
      const progressList = response.data.progress || [];
      // Find this chapter's progress
      const currentProgress = progressList.find((p: any) => p.id === chapterProgress.id);
      if (currentProgress) {
        setProgress(currentProgress);
        return currentProgress;
      }
    } catch (err: any) {
      console.error("Failed to fetch progress:", err);
    }
    return null;
  };

  const fetchAIContent = async (progressContext?: typeof chapterProgress) => {
    try {
      setLoadingContent(true);
      setContentError(null);
      setAiContent(null);
      const effectiveProgress = progressContext || progress;
      const nextLearningLevel = effectiveProgress.level1_completed
        ? effectiveProgress.level2_completed
          ? 3
          : 2
        : 1;

      const response = await axiosClient.post('/content/generate-notes', {
        topic,
        chapter_title: chapterProgress.chapter_title,
        learning_level: nextLearningLevel
      });
      setAiContent(response.data);
    } catch (err: any) {
      console.error("Failed to fetch AI content:", err);
      setContentError("Failed to generate notes and videos. Please try again.");
    } finally {
      setLoadingContent(false);
    }
  };

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const handleStartLevel = (level: number) => {
    onNavigate('level-exercises', {
      level,
      chapterProgress: progress,
      topic,
      pathId
    });
  };

  const handleStartQuiz = () => {
    onNavigate('chapter-quiz', {
      chapterProgress: progress,
      topic,
      pathId
    });
  };

  const allLevelsDone = progress.level1_completed && progress.level2_completed && progress.level3_completed;
  const levelsCompleted = [progress.level1_completed, progress.level2_completed, progress.level3_completed].filter(Boolean).length;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole="student" onLogout={logout} />
      
      <div className="flex">
        <Sidebar userRole="student" currentScreen="chapter-learning" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Button 
                variant="ghost" 
                onClick={onBack}
                className={`mb-4 ${isDarkMode ? 'text-gray-300 hover:text-white' : ''}`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Learning Path
              </Button>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    Chapter {chapterProgress.chapter_index + 1}
                  </p>
                  <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {chapterProgress.chapter_title}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-semibold ${isDarkMode ? 'text-gray-300' : ''}`}>
                    {levelsCompleted}/3 Levels
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <LevelCard
                level={1}
                title="Dry Run"
                description="MCQs & Fill Blanks"
                icon={<Brain className="w-6 h-6" />}
                completed={progress.level1_completed}
                locked={false}
                color="blue"
                onClick={() => handleStartLevel(1)}
                isDarkMode={isDarkMode}
              />
              <LevelCard
                level={2}
                title="Complete Code"
                description="Fill missing parts"
                icon={<Pencil className="w-6 h-6" />}
                completed={progress.level2_completed}
                locked={!progress.level1_completed}
                color="orange"
                onClick={() => handleStartLevel(2)}
                isDarkMode={isDarkMode}
              />
              <LevelCard
                level={3}
                title="Write Code"
                description="Full implementation"
                icon={<Code className="w-6 h-6" />}
                completed={progress.level3_completed}
                locked={!progress.level2_completed}
                color="purple"
                onClick={() => handleStartLevel(3)}
                isDarkMode={isDarkMode}
              />
              <LevelCard
                level={4}
                title="Chapter Quiz"
                description="Unlock next chapter"
                icon={<Trophy className="w-6 h-6" />}
                completed={progress.chapter_quiz_passed}
                locked={!allLevelsDone}
                color="yellow"
                onClick={handleStartQuiz}
                isDarkMode={isDarkMode}
                isQuiz
              />
            </div>

            {/* Tabs for Resources/Notes */}
            <Tabs defaultValue="resources" className="w-full">
              <TabsList className={`grid w-full grid-cols-2 ${isDarkMode ? 'bg-gray-800' : ''}`}>
                <TabsTrigger value="resources" className="flex items-center gap-2">
                  <Youtube className="w-4 h-4" />
                  Video Resources
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Study Notes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="resources">
                <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                  <CardHeader>
                    <CardTitle className={isDarkMode ? 'text-white' : ''}>
                      Video Tutorials
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingContent ? (
                      <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Finding Video Resources</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Searching for chapter-specific videos...</p>
                      </div>
                    ) : contentError ? (
                      <div className="text-center py-8 space-y-4">
                        <p className="text-red-500">{contentError}</p>
                        <Button onClick={fetchAIContent} variant="outline">
                          Try Again
                        </Button>
                      </div>
                    ) : aiContent?.youtube_videos && aiContent.youtube_videos.length > 0 ? (
                      <div className="space-y-4">
                        {aiContent.youtube_videos.map((video, index) => {
                          const videoId = getYouTubeId(video.url);
                          return (
                            <div key={index} className="space-y-2">
                              {videoId ? (
                                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                  <iframe
                                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    title={video.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              ) : (
                                <a
                                  href={video.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all hover:shadow-md ${
                                    isDarkMode
                                      ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                                      : 'bg-white border-gray-200 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-red-900/50' : 'bg-red-100'}`}>
                                    <Youtube className="w-6 h-6 text-red-500" />
                                  </div>
                                  <div className="flex-1">
                                    <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{video.title}</h3>
                                  </div>
                                  <ExternalLink className={`w-5 h-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                </a>
                              )}
                              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {video.title}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                        No video recommendations available yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes">
                <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                  <CardHeader>
                    <CardTitle className={isDarkMode ? 'text-white' : ''}>
                      AI-Generated Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingContent ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-6">
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FileText className={`w-6 h-6 animate-pulse ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                          </div>
                        </div>
                        <div className="text-center space-y-2 max-w-md mx-auto">
                          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                            Generating Personalized Notes...
                          </h3>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Creating chapter summary and key points for {chapterProgress.chapter_title}.
                          </p>
                        </div>
                        <div className="w-full max-w-xs h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                           <div className="absolute top-0 bottom-0 left-0 bg-indigo-500 rounded-full animate-pulse" style={{ width: "65%" }}></div>
                        </div>
                      </div>
                    ) : contentError ? (
                      <div className="text-center py-8 space-y-4">
                        <p className="text-red-500">{contentError}</p>
                        <Button onClick={fetchAIContent} variant="outline">
                          Try Again
                        </Button>
                      </div>
                    ) : aiContent ? (
                      <div className="space-y-6">
                        <div>
                          <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : ''}`}>
                            Summary
                          </h4>
                          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {aiContent.summary}
                          </p>
                        </div>

                        {aiContent.key_points && aiContent.key_points.length > 0 && (
                          <div>
                            <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : ''}`}>
                              Key Points
                            </h4>
                            <ul className="space-y-2">
                              {aiContent.key_points.map((point, index) => (
                                <li key={index} className={`flex items-start gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  <span className="text-indigo-500 font-bold">{index + 1}.</span>
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className={`p-4 rounded-lg border-l-4 border-indigo-500 ${
                          isDarkMode ? 'bg-indigo-900/20' : 'bg-indigo-50'
                        }`}>
                          <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : ''}`}>
                            Coming Up Next
                          </h4>
                          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {aiContent.next_chapter_preview}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                        No notes available yet.
                      </p>
                    )}
                    {/* Regenerate Notes Button */}
                    {!loadingContent && (
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <p className="text-xs text-gray-400 italic">
                          Notes are uniquely generated by AI each time. Not satisfied? Ask for a fresh perspective.
                        </p>
                        <Button
                          variant="outline"
                          onClick={fetchAIContent}
                          className={`min-w-[180px] ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}`}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Regenerate Notes
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

interface LevelCardProps {
  level: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  locked: boolean;
  color: 'blue' | 'orange' | 'purple' | 'yellow';
  onClick: () => void;
  isDarkMode: boolean;
  isQuiz?: boolean;
}

function LevelCard({ 
  level, title, description, icon, completed, locked, color, onClick, isDarkMode, isQuiz 
}: LevelCardProps) {
  const colorStyles: Record<string, string> = {
    blue: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    orange: 'linear-gradient(135deg, #f59e0b, #ea580c)',
    purple: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    yellow: 'linear-gradient(135deg, #eab308, #f59e0b)',
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : ''
      } ${
        locked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105'
      } ${
        completed ? 'ring-2 ring-green-500' : ''
      }`}
      onClick={() => !locked && onClick()}
    >
      <CardContent className="py-4 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center text-white" style={{ background: colorStyles[color] }}>
          {completed ? <CheckCircle className="w-6 h-6" /> : locked ? <Lock className="w-5 h-5" /> : icon}
        </div>
        <h4 className={`font-semibold text-sm ${isDarkMode ? 'text-white' : ''}`}>
          {isQuiz ? title : `Level ${level}`}
        </h4>
        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {locked ? 'Locked' : completed ? 'Completed ✓' : description}
        </p>
      </CardContent>
    </Card>
  );
}

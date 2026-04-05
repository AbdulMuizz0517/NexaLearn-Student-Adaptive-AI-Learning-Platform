import { useState, useEffect } from 'react';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ArrowLeft, CheckCircle, Loader2, Youtube, BookOpen, Sparkles, ExternalLink, List } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';
import axiosClient from '../../api/axiosClient';

interface LessonViewerProps {
  lesson: any;
  onBack: () => void;

  onNavigate: (screen: string) => void;
  userRole: 'student' | 'teacher' | 'admin' | null;
}

interface AIContent {
  topic: string;
  summary: string;
  key_points: string[];
  next_chapter_preview: string;
  youtube_videos: { title: string; url: string; type: string }[];
}

export default function LessonViewer({ lesson, onBack, onNavigate, userRole }: LessonViewerProps) {
  const [completed, setCompleted] = useState(false);
  const [aiContent, setAiContent] = useState<AIContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();

  // Auto-fetch AI content when component mounts
  useEffect(() => {
    if (lesson?.title) {
      fetchAIContent(false);
    }
  }, [lesson?.title]);

  const fetchAIContent = async (forceRegenerate = false) => {
    if (loadingContent) return;
    
    setLoadingContent(true);
    setContentError(null);
    setAiContent(null); // Clear old content so loading state is shown
    
    try {
      const baseTopic = lesson.courseTopic || lesson.topic || lesson.title;
      const response = await axiosClient.post('/content/generate-notes', {
        topic: baseTopic,
        chapter_title: lesson.title,
        variation_seed: forceRegenerate ? `${Date.now()}-${Math.floor(Math.random() * 10000)}` : undefined
      });
      setAiContent(response.data);
    } catch (error: any) {
      setContentError('Failed to generate AI content. Please try again.');
      console.error('AI Content Error:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  if (!lesson) return null;

  // Get subchapters if available
  const subchapters = lesson.subchapters || [];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole={userRole} onLogout={handleLogout} />
      
      <div className="flex">
        {userRole && <Sidebar userRole={userRole} currentScreen="course-library" onNavigate={onNavigate} />}
        
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Back Button */}
            <Button variant="ghost" onClick={onBack} className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Course
            </Button>

            {/* Chapter Header */}
            <div className={`rounded-lg p-6 mb-6 ${isDarkMode ? 'bg-gradient-to-r from-indigo-900 to-purple-900' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
              <h1 className="text-3xl text-white mb-2">Chapter {lesson.id}: {lesson.title}</h1>
              {subchapters.length > 0 && (
                <p className="text-indigo-200">{subchapters.length} topics in this chapter</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Tabs - Only AI Notes and Videos now */}
                <Tabs defaultValue="ai-notes" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="ai-notes" className="flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      AI Notes
                    </TabsTrigger>
                    <TabsTrigger value="videos" className="flex items-center gap-1">
                      <Youtube className="w-4 h-4" />
                      Videos
                    </TabsTrigger>
                    <TabsTrigger value="topics" className="flex items-center gap-1">
                      <List className="w-4 h-4" />
                      Topics
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* AI-Generated Notes Tab */}
                  <TabsContent value="ai-notes" className="mt-4">
                    <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles className="w-6 h-6 text-indigo-500" />
                          <h2 className={`text-2xl ${isDarkMode ? 'text-white' : ''}`}>AI-Generated Notes</h2>
                        </div>
                        
                        {loadingContent ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Generating personalized notes for "{lesson.title}"...</p>
                          </div>
                        ) : contentError ? (
                          <div className="text-center py-8">
                            <p className="text-red-500 mb-4">{contentError}</p>
                            <Button onClick={() => fetchAIContent(true)} variant="outline">
                              Try Again
                            </Button>
                          </div>
                        ) : aiContent ? (
                          <div className="space-y-6">
                            {/* Summary */}
                            <div>
                              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Summary</h3>
                              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{aiContent.summary}</p>
                            </div>
                            
                            {/* Key Points */}
                            <div>
                              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Key Points</h3>
                              <ul className="space-y-2">
                                {aiContent.key_points.map((point, index) => (
                                  <li key={index} className={`flex items-start gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <span className="text-indigo-500 font-bold">{index + 1}.</span>
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            {/* Next Chapter Preview */}
                            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-700' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <BookOpen className="w-5 h-5 text-indigo-500" />
                                <h3 className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Coming Up Next</h3>
                              </div>
                              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{aiContent.next_chapter_preview}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Sparkles className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading AI notes...</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {/* YouTube Videos Tab */}
                  <TabsContent value="videos" className="mt-4">
                    <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Youtube className="w-6 h-6 text-red-500" />
                          <h2 className={`text-2xl ${isDarkMode ? 'text-white' : ''}`}>Recommended Videos</h2>
                        </div>
                        
                        {loadingContent ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-4" />
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Finding relevant videos...</p>
                          </div>
                        ) : aiContent?.youtube_videos ? (
                          <div className="space-y-4">
                            {aiContent.youtube_videos.map((video, index) => {
                              // Extract YouTube video ID from URL
                              const getYouTubeId = (url: string) => {
                                const match = url.match(/(?:v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
                                return match ? match[1] : null;
                              };
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
                          <div className="text-center py-8">
                            <Youtube className="w-12 h-12 text-red-300 mx-auto mb-4" />
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading video recommendations...</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Topics/Subchapters Tab */}
                  <TabsContent value="topics" className="mt-4">
                    <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <List className="w-6 h-6 text-purple-500" />
                          <h2 className={`text-2xl ${isDarkMode ? 'text-white' : ''}`}>Topics in This Chapter</h2>
                        </div>
                        
                        {Array.isArray(subchapters) && subchapters.length > 0 ? (
                          <div className="space-y-3">
                            {subchapters.map((topic: any, index: number) => (
                              <div 
                                key={index}
                                className={`flex items-center gap-4 p-4 rounded-lg border ${
                                  isDarkMode 
                                    ? 'bg-gray-700 border-gray-600' 
                                    : 'bg-white border-gray-200'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  isDarkMode ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600'
                                }`}>
                                  {index + 1}
                                </div>
                                <p className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>{typeof topic === 'string' ? topic : topic?.title || topic?.name || JSON.stringify(topic)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <List className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                              No specific topics listed for this chapter.
                            </p>
                            <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              Check the AI Notes tab for a detailed breakdown.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
              
              {/* Sidebar */}
              <div className="space-y-6">
                <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                  <CardContent className="pt-6">
                    <h3 className={`mb-4 ${isDarkMode ? 'text-white' : ''}`}>Chapter Actions</h3>
                    <div className="space-y-3">
                      <Button 
                        variant={completed ? "default" : "outline"}
                        className={`w-full ${completed ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        onClick={() => setCompleted(!completed)}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        {completed ? 'Completed ✓' : 'Mark as Completed'}
                      </Button>


                      <Button 
                        variant="outline"
                        className={`w-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-indigo-50'}`}
                        onClick={() => fetchAIContent(true)}
                        disabled={loadingContent}
                      >
                        <Sparkles className="w-5 h-5 mr-2" />
                        {loadingContent ? 'Generating...' : 'Regenerate Notes'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                  <CardContent className="pt-6">
                    <h3 className={`mb-4 ${isDarkMode ? 'text-white' : ''}`}>Learning Tips</h3>
                    <ul className={`space-y-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <li className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                        <span>Read the AI-generated summary first</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Youtube className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <span>Watch recommended videos for visual learning</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <List className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                        <span>Review all topics in the chapter</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>Mark as completed when you're done</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

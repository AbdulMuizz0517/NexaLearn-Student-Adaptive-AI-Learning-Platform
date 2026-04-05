import { useState, useMemo } from 'react';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ArrowLeft, Play, CheckCircle, Lock, BookOpen, Sparkles, Youtube, FileText } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';

interface CourseDetailProps {
  course: any;
  onSelectLesson: (lesson: any) => void;
  onBack: () => void;
  onNavigate: (screen: string) => void;
  userRole: 'student' | 'teacher' | 'admin' | null;
}

export default function CourseDetail({ course, onSelectLesson, onBack, onNavigate, userRole }: CourseDetailProps) {
  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  
  // Parse course content - handle both direct object and parsed content
  const courseContent = useMemo(() => {
    if (course?.content) return course.content;
    if (course?.generated_content) {
      if (typeof course.generated_content === 'string') {
        try {
          return JSON.parse(course.generated_content);
        } catch {
          return null;
        }
      }
      return course.generated_content;
    }
    return null;
  }, [course]);

  // Convert chapters to lessons format
  const lessons = useMemo(() => {
    if (!courseContent?.chapters) return [];
    
    return courseContent.chapters.map((chapter: any, index: number) => ({
      id: index + 1,
      title: chapter.title || chapter,
      subchapters: chapter.subchapters || [],
      completed: completedLessons.includes(index + 1),
      locked: false // All chapters unlocked for learning
    }));
  }, [courseContent, completedLessons]);

  if (!course) return null;

  const courseName = courseContent?.title || course.topic || 'Learning Path';
  const difficulty = courseContent?.difficulty || 'Beginner';
  const totalLessons = lessons.length;
  const completedCount = completedLessons.length;
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const selectLessonWithContext = (lesson: any) => {
    onSelectLesson({
      ...lesson,
      courseTopic: course.topic || courseName,
    });
  };

  const handleOpenNotesFromMyCourses = () => {
    if (!nextLesson) return;
    selectLessonWithContext(nextLesson);
  };

  // Find first incomplete lesson for "Continue Learning"
  const nextLesson = lessons.find((l: any) => !l.completed) || lessons[0];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole={userRole} onLogout={handleLogout} />
      
      <div className="flex">
        {userRole && <Sidebar userRole={userRole} currentScreen="course-library" onNavigate={onNavigate} />}
        
        <main className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            {/* Back Button */}
            <Button variant="ghost" onClick={onBack} className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
            
            {/* Course Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-8 mb-6">
              <h1 className="text-4xl mb-3">{courseName}</h1>
              <p className="text-xl text-indigo-100 mb-4 capitalize">{difficulty} Level</p>
              <div className="flex gap-6">
                <span>{totalLessons} Chapters</span>
                <span>·</span>
                <span>{progress}% Complete</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lessons List */}
              <div className="lg:col-span-2">
                <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                  <CardContent className="pt-6">
                    <h2 className={`text-2xl mb-6 ${isDarkMode ? 'text-white' : ''}`}>Course Content</h2>
                    
                    {lessons.length === 0 ? (
                      <div className="text-center py-8">
                        <BookOpen className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No chapters available</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {lessons.map((lesson: any) => (
                          <div 
                            key={lesson.id}
                            className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 hover:border-indigo-500 hover:bg-gray-600' 
                                : 'bg-white border-indigo-200 hover:border-indigo-400 hover:shadow-md'
                            }`}
                            onClick={() => selectLessonWithContext(lesson)}
                          >
                            <div className={`p-3 rounded-lg ${
                              lesson.completed 
                                ? 'bg-green-100' 
                                : isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'
                            }`}>
                              {lesson.completed ? (
                                <CheckCircle className="w-6 h-6 text-green-600" />
                              ) : (
                                <Play className={`w-6 h-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <p className={`mb-1 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Chapter {lesson.id}: {lesson.title}
                              </p>
                              {lesson.subchapters?.length > 0 && (
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {lesson.subchapters.length} topics
                                </p>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              <div className={`p-2 rounded ${isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`} title="AI Notes available">
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                              </div>
                              <div className={`p-2 rounded ${isDarkMode ? 'bg-red-900/30' : 'bg-red-50'}`} title="Video tutorials available">
                                <Youtube className="w-4 h-4 text-red-500" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Sidebar */}
              <div className="space-y-6">
                <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                  <CardContent className="pt-6">
                    <h3 className={`mb-4 ${isDarkMode ? 'text-white' : ''}`}>Overview</h3>
                    <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      This personalized learning path was generated based on your quiz performance. 
                      Each chapter includes AI-generated notes and curated YouTube video links to help you learn effectively.
                    </p>
                    {nextLesson && (
                      <div className="space-y-2">
                        <Button 
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                          onClick={() => selectLessonWithContext(nextLesson)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {completedCount > 0 ? 'Continue Learning' : 'Start Learning'}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleOpenNotesFromMyCourses}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Open Notes & Videos
                        </Button>
                        <p className={`text-xs text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Notes generation is available directly from My Courses.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                  <CardContent className="pt-6">
                    <h3 className={`mb-4 ${isDarkMode ? 'text-white' : ''}`}>Features</h3>
                    <ul className={`space-y-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <li className="flex items-start gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                        <span>AI-generated notes for each chapter</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Youtube className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                        <span>Curated YouTube video tutorials</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <BookOpen className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
                        <span>Key concepts & terminology</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                        <span>Track your progress</span>
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

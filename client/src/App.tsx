import { useState, useEffect } from 'react';
import SplashScreen from './components/screens/SplashScreen';
import OnboardingWelcome from './components/screens/OnboardingWelcome';
import OnboardingWhy from './components/screens/OnboardingWhy';
import LoginScreen from './components/screens/LoginScreen';
import SignupStudent from './components/screens/SignupStudent';
import StudentDashboard from './components/screens/StudentDashboard';
import CourseLibrary from './components/screens/CourseLibrary';
import CourseDetail from './components/screens/CourseDetail';
import LessonViewer from './components/screens/LessonViewer';
import QuizHome from './components/screens/QuizHome';
import QuizQuestion from './components/screens/QuizQuestion';
import QuizResult from './components/screens/QuizResult';
import AssignmentsList from './components/screens/AssignmentsList';
import AssignmentDetail from './components/screens/AssignmentDetail';
import AssignmentConfirmation from './components/screens/AssignmentConfirmation';
import StudentProfile from './components/screens/StudentProfile';
import EditProfile from './components/screens/EditProfile';
import AdminDashboard from './components/screens/AdminDashboard';
import UserManagement from './components/screens/UserManagement';
import Notifications from './components/screens/Notifications';
import Settings from './components/screens/Settings';
import LearningPathView from './components/screens/LearningPathView';
import ChapterLearning from './components/screens/ChapterLearning';
import LevelExercises from './components/screens/LevelExercises';
import ChapterQuiz from './components/screens/ChapterQuiz';
import FeedbackForm from './components/screens/FeedbackForm';
import StudentReport from './components/screens/StudentReport';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState(() => {
    // If already authenticated, skip splash and go to saved screen or dashboard
    const token = localStorage.getItem('token');
    if (token) {
      return localStorage.getItem('lastScreen') || 'student-dashboard';
    }
    return 'splash';
  });
  const [userRole, setUserRole] = useState<'student' | 'teacher' | 'admin' | null>(() => {
    const saved = localStorage.getItem('userRole');
    if (saved) return saved as 'student' | 'teacher' | 'admin';
    // Fallback: derive role from stored user data
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const role = parsed?.role as string;
        if (role === 'admin' || role === 'teacher' || role === 'student') {
          localStorage.setItem('userRole', role);
          return role;
        }
        // Default to student if user exists but role is unknown
        localStorage.setItem('userRole', 'student');
        return 'student';
      } catch { /* ignore parse errors */ }
    }
    return null;
  });
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizTopic, setQuizTopic] = useState<string>('python');
  
  // Learning path state
  const [selectedPath, setSelectedPath] = useState<{ id: number; topic: string } | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1);
  
  const { isDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();

  // When user logs out (isAuthenticated becomes false), go back to login
  useEffect(() => {
    if (!isAuthenticated && currentScreen !== 'splash' && currentScreen !== 'onboarding-welcome' && currentScreen !== 'onboarding-why' && currentScreen !== 'login' && currentScreen !== 'signup-student') {
      setCurrentScreen('login');
      setUserRole(null);
      localStorage.removeItem('lastScreen');
      localStorage.removeItem('userRole');
    }
  }, [isAuthenticated]);

  // Auto-navigate from splash to onboarding
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentScreen === 'splash') {
        setCurrentScreen('onboarding-welcome');
      }
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [currentScreen]);

  const navigate = (screen: string, data?: any) => {
    setCurrentScreen(screen);

    // Clear stale selection state across major context switches.
    if (screen === 'course-library') {
      setSelectedCourse(null);
      setSelectedLesson(null);
    }
    if (screen === 'course-detail' && data?.course) {
      setSelectedLesson(null);
    }
    if (screen === 'student-dashboard' || screen === 'admin-dashboard') {
      setSelectedCourse(null);
      setSelectedLesson(null);
      setSelectedAssignment(null);
      setSelectedStudent(null);
    }
    if (screen === 'learning-path' || screen === 'chapter-learning' || screen === 'level-exercises' || screen === 'chapter-quiz') {
      setSelectedCourse(null);
      setSelectedLesson(null);
    }

    // Persist screen for refresh survival
    const persistScreens = ['student-dashboard', 'admin-dashboard', 'admin-report', 'course-library', 'quiz-home', 'student-profile', 'feedback', 'user-management', 'notifications', 'settings'];
    if (persistScreens.includes(screen)) {
      localStorage.setItem('lastScreen', screen);
    }
    if (data?.course) setSelectedCourse(data.course);
    if (data?.lesson) setSelectedLesson(data.lesson);
    if (data?.assignment) setSelectedAssignment(data.assignment);
    if (data?.student) setSelectedStudent(data.student);
    if (data?.role) {
      setUserRole(data.role);
      localStorage.setItem('userRole', data.role);
    }
    if (data?.answers) setQuizAnswers(data.answers);
    if (data?.topic) setQuizTopic(data.topic);
    
    // Learning path data
    if (data?.pathId !== undefined && data?.pathTopic) {
      setSelectedPath({ id: data.pathId, topic: data.pathTopic });
    }
    if (data?.chapterProgress) setSelectedChapter(data.chapterProgress);
    if (data?.level) setSelectedLevel(data.level);
    
    // Clear learning-path-specific state when navigating away to non-path screens
    const pathScreens = ['learning-path', 'chapter-learning', 'level-exercises', 'chapter-quiz'];
    if (!pathScreens.includes(screen) && !data?.pathId) {
      setSelectedPath(null);
      setSelectedChapter(null);
      setSelectedLevel(1);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen />;
      case 'onboarding-welcome':
        return <OnboardingWelcome onNext={() => navigate('onboarding-why')} />;
      case 'onboarding-why':
        return <OnboardingWhy onNext={() => navigate('login')} />;
      case 'login':
        return <LoginScreen 
          onLogin={(role) => {
            const dashboardMap: Record<string, string> = {
              student: 'student-dashboard',
              admin: 'admin-dashboard'
            };
            navigate(dashboardMap[role] || 'student-dashboard', { role: role === 'admin' ? 'admin' : 'student' });
          }}
          onSignup={() => navigate('signup-student')}
        />;
      case 'signup-student':
        return <SignupStudent 
          onSignup={() => navigate('student-dashboard', { role: 'student' })}
          onLogin={() => navigate('login')}
          onBack={() => navigate('login')}
        />;
      
      // Student screens
      case 'student-dashboard':
        return <StudentDashboard 
          onNavigate={(screen) => navigate(screen)}
        />;
      case 'assignments-list':
        return <AssignmentsList 
          onNavigate={navigate}
          userRole={userRole}
        />;
      case 'assignment-detail':
        return <AssignmentDetail 
          assignment={selectedAssignment}
          onNavigate={navigate}
          userRole={userRole}
        />;
      case 'assignment-confirmation':
        return <AssignmentConfirmation 
          assignment={selectedAssignment}
          onNavigate={navigate}
          userRole={userRole}
        />;
      case 'student-profile':
        return <StudentProfile 
          onNavigate={navigate}
          userRole={userRole}
        />;
      case 'edit-profile':
        return <EditProfile 
          onNavigate={navigate}
          userRole={userRole}
        />;
      case 'feedback':
        return <FeedbackForm 
          onNavigate={navigate}
        />;
      
      // Admin screens
      case 'admin-dashboard':
        return <AdminDashboard 
          onNavigate={navigate}
        />;
      case 'admin-report':
        return <AdminDashboard
          onNavigate={navigate}
          initialTab="reports"
        />;
      case 'user-management':
        return <UserManagement 
          onNavigate={navigate}
        />;
      
      // Shared screens
      case 'course-library':
        return <CourseLibrary 
          onSelectCourse={(course) => navigate('course-detail', { course })}
          onBack={() => {
            const dashboardMap: Record<string, string> = {
              student: 'student-dashboard',
              admin: 'admin-dashboard'
            };
            navigate(userRole ? (dashboardMap[userRole] || 'student-dashboard') : 'student-dashboard');
          }}
          onNavigate={navigate}
          userRole={userRole}
        />;
      case 'course-detail':
        return <CourseDetail 
          course={selectedCourse}
          onSelectLesson={(lesson) => navigate('lesson-viewer', { lesson })}
          onBack={() => navigate('course-library')}
          onNavigate={navigate}
          userRole={userRole}
        />;
      case 'lesson-viewer':
        return <LessonViewer 
          lesson={selectedLesson}
          onBack={() => navigate('course-detail')}
          onNavigate={navigate}
          userRole={userRole}
        />;
      case 'quiz-home':
        return <QuizHome 
          onStart={(language) => navigate('quiz-question', { topic: language })}
          onBack={() => navigate('student-dashboard')}
          onNavigate={navigate}
          userRole={userRole}
        />;
      case 'quiz-question':
        return <QuizQuestion 
          topic={quizTopic}
          onComplete={(answers) => navigate('quiz-result', { answers })}
          onExit={() => navigate('student-dashboard')}
          userRole={userRole}
        />;
      case 'quiz-result':
        return <QuizResult 
          answers={quizAnswers}
          onRetake={() => navigate('quiz-home')}
          onBack={() => navigate('student-dashboard')}
          onNavigate={navigate}
          userRole={userRole}
        />;
      case 'notifications':
        return <Notifications 
          onNavigate={navigate}
          userRole={userRole || 'student'}
        />;
      case 'settings':
        return <Settings 
          onNavigate={navigate}
          userRole={userRole || 'student'}
        />;
      
      // Learning Path screens
      case 'learning-path':
        return selectedPath ? (
          <LearningPathView
            pathId={selectedPath.id}
            topic={selectedPath.topic}
            onNavigate={navigate}
            onBack={() => navigate('student-dashboard')}
          />
        ) : (
          <StudentDashboard onNavigate={navigate} />
        );
      
      case 'chapter-learning':
        return selectedChapter && selectedPath ? (
          <ChapterLearning
            chapterProgress={selectedChapter}
            topic={selectedPath.topic}
            pathId={selectedPath.id}
            onNavigate={navigate}
            onBack={() => navigate('learning-path', { 
              pathId: selectedPath.id, 
              pathTopic: selectedPath.topic 
            })}
          />
        ) : (
          <StudentDashboard onNavigate={navigate} />
        );
      
      case 'level-exercises':
        return selectedChapter && selectedPath ? (
          <LevelExercises
            level={selectedLevel}
            chapterProgress={selectedChapter}
            topic={selectedPath.topic}
            pathId={selectedPath.id}
            onNavigate={navigate}
            onBack={() => navigate('chapter-learning', {
              chapterProgress: selectedChapter,
              topic: selectedPath.topic,
              pathId: selectedPath.id
            })}
            onComplete={() => navigate('chapter-learning', {
              chapterProgress: selectedChapter,
              topic: selectedPath.topic,
              pathId: selectedPath.id
            })}
          />
        ) : (
          <StudentDashboard onNavigate={navigate} />
        );
      
      case 'chapter-quiz':
        return selectedChapter && selectedPath ? (
          <ChapterQuiz
            chapterProgress={selectedChapter}
            topic={selectedPath.topic}
            pathId={selectedPath.id}
            onNavigate={navigate}
            onBack={() => navigate('chapter-learning', {
              chapterProgress: selectedChapter,
              topic: selectedPath.topic,
              pathId: selectedPath.id
            })}
            onComplete={(passed) => navigate('learning-path', {
              pathId: selectedPath.id,
              pathTopic: selectedPath.topic
            })}
          />
        ) : (
          <StudentDashboard onNavigate={navigate} />
        );

      // Student Report (admin or student self-view)
      case 'student-report':
        return (
          <StudentReport
            student={selectedStudent}
            onNavigate={navigate}
            onBack={() => {
              const backScreen = userRole === 'admin' ? 'admin-dashboard' : 'student-dashboard';
              navigate(backScreen);
            }}
          />
        );

      default:
        return <SplashScreen />;
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      {renderScreen()}
    </div>
  );
}
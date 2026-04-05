import { useState, useEffect } from "react";
import { 
  CheckCircle, XCircle, ArrowLeft, ArrowRight, 
  Loader2, Trophy, Clock, AlertCircle, Star
} from "lucide-react";
import NavBar from "../NavBar";
import Sidebar from "../Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

interface ChapterQuizProps {
  chapterProgress: {
    id: number;
    chapter_index: number;
    chapter_title: string;
  };
  topic: string;
  pathId: number;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
  onComplete: (passed: boolean) => void;
}

interface Question {
  id: number;
  question: string;
  code?: string;
  options: string[];
  answer: string;
  explanation?: string;
}

interface QuizData {
  quiz_type: string;
  chapter: string;
  topic: string;
  passing_score: number;
  questions: Question[];
  unlock_message: string;
  fail_message: string;
}

export default function ChapterQuiz({
  chapterProgress,
  topic,
  pathId,
  onNavigate,
  onBack,
  onComplete
}: ChapterQuizProps) {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    correct: number;
    total: number;
    passed: boolean;
    message: string;
    next_chapter_unlocked: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userName = user?.full_name || user?.email?.split('@')[0] || 'Student';

  useEffect(() => {
    fetchQuiz();
  }, [chapterProgress.id]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(
        `/progress/chapter-quiz/${chapterProgress.id}?topic=${encodeURIComponent(topic)}`
      );
      setQuizData(response.data);
    } catch (err: any) {
      console.error("Failed to fetch quiz:", err);
      setError(err?.response?.data?.detail || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = quizData?.questions?.[currentIndex];
  const totalQuestions = quizData?.questions?.length || 0;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const allAnswered = Object.keys(answers).length === totalQuestions;

  const handleSelectAnswer = (option: string) => {
    if (submitted) return;
    setAnswers({ ...answers, [currentIndex]: option });
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quizData || !user?.id) return;

    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([index, answer]) => ({
        question_id: quizData.questions[parseInt(index)].id,
        selected_answer: answer
      }));

      const response = await axiosClient.post("/progress/chapter-quiz/submit", {
        user_id: user.id,
        topic_progress_id: chapterProgress.id,
        answers: formattedAnswers,
        quiz_data: quizData
      });

      setResult(response.data);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Failed to submit quiz:", err);
      setError("Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    if (result) {
      onComplete(result.passed);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
            Preparing your quiz...
          </p>
        </div>
      </div>
    );
  }

  // Result Screen
  if (submitted && result) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
        <NavBar userName={userName} userRole="student" onLogout={logout} />
        
        <div className="flex">
          <Sidebar userRole="student" currentScreen="quiz" onNavigate={onNavigate} />
          
          <main className="flex-1 p-8">
            <div className="max-w-2xl mx-auto">
              <Card className={`text-center ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                <CardContent className="py-12">
                  {result.passed ? (
                    <>
                      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                        <Trophy className="w-12 h-12 text-green-600" />
                      </div>
                      <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : ''}`}>
                        🎉 Congratulations!
                      </h2>
                      <p className={`text-xl mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        You passed the chapter quiz!
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-orange-100 flex items-center justify-center">
                        <AlertCircle className="w-12 h-12 text-orange-600" />
                      </div>
                      <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : ''}`}>
                        Keep Practicing!
                      </h2>
                      <p className={`text-xl mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        You need 50% to unlock the next chapter
                      </p>
                    </>
                  )}

                  <div className={`p-6 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="text-5xl font-bold mb-2" style={{
                      color: result.passed ? '#22c55e' : '#f97316'
                    }}>
                      {Math.round(result.score)}%
                    </div>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {result.correct} out of {result.total} correct
                    </p>
                  </div>

                  <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {result.message}
                  </p>

                  {result.next_chapter_unlocked && (
                    <div className="flex items-center justify-center gap-2 text-green-600 mb-6">
                      <Star className="w-5 h-5" />
                      <span className="font-semibold">Next chapter unlocked!</span>
                    </div>
                  )}

                  <div className="flex justify-center gap-4">
                    {!result.passed && (
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSubmitted(false);
                          setResult(null);
                          setAnswers({});
                          setCurrentIndex(0);
                          fetchQuiz();
                        }}
                      >
                        Try Again
                      </Button>
                    )}
                    <Button 
                      onClick={handleFinish}
                      className={result.passed ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}
                    >
                      {result.passed ? 'Continue Learning' : 'Review Chapter'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Answer Visibility Policy */}
              <Card className={`mt-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                <CardHeader>
                  <CardTitle className={isDarkMode ? 'text-white' : ''}>
                    Answer Review Policy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.passed ? (
                    <div className={`p-6 text-center rounded-lg border ${isDarkMode ? 'bg-green-900/10 border-green-800' : 'bg-green-50 border-green-200'}`}>
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
                      <p className={`font-medium ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                        Great work. Answer keys stay hidden after passing.
                      </p>
                      <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-green-700/80'}`}>
                        This keeps quiz integrity consistent for all learners.
                      </p>
                    </div>
                  ) : (
                    <div className={`p-6 text-center rounded-lg border ${isDarkMode ? 'bg-orange-900/10 border-orange-800' : 'bg-orange-50 border-orange-200'}`}>
                      <AlertCircle className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                      <p className={`font-medium ${isDarkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                        Answer review is hidden for failed attempts
                      </p>
                      <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-orange-600/80'}`}>
                        Please review chapter materials and retry the quiz.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole="student" onLogout={logout} />
      
      <div className="flex">
        <Sidebar userRole="student" currentScreen="quiz" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Button 
                variant="ghost" 
                onClick={onBack}
                className={`mb-4 ${isDarkMode ? 'text-gray-300 hover:text-white' : ''}`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Chapter
              </Button>
              
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 rounded-lg text-white mb-4">
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8" />
                  <div>
                    <h1 className="text-2xl font-bold">Chapter Quiz</h1>
                    <p className="opacity-90">{chapterProgress.chapter_title}</p>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-4 mb-4">
                <Progress value={progress} className="flex-1 h-3" />
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : ''}`}>
                  {currentIndex + 1}/{totalQuestions}
                </span>
              </div>

              {/* Question Navigation Dots */}
              <div className="flex justify-center gap-2 flex-wrap">
                {quizData?.questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                      currentIndex === index
                        ? 'bg-indigo-600 text-white'
                        : answers[index]
                          ? 'bg-green-500 text-white'
                          : isDarkMode
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Card */}
            {currentQuestion && (
              <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                <CardContent className="py-8">
                  <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentQuestion.question}
                  </h3>

                  {currentQuestion.code && (
                    <pre className="p-4 rounded-lg overflow-x-auto mb-6 bg-gray-900 text-green-400">
                      <code>{currentQuestion.code}</code>
                    </pre>
                  )}

                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectAnswer(option)}
                        className={`w-full p-4 rounded-lg border text-left transition-all ${
                          answers[currentIndex] === option
                            ? isDarkMode ? 'bg-indigo-900/40 border-indigo-500 text-indigo-200' : 'bg-indigo-100 border-indigo-500 text-indigo-800'
                            : isDarkMode
                              ? 'bg-gray-700 border-gray-600 hover:border-indigo-400 text-gray-200'
                              : 'bg-white border-gray-200 hover:border-indigo-300 text-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                            answers[currentIndex] === option
                              ? 'bg-indigo-600 text-white'
                              : isDarkMode
                                ? 'bg-gray-600 text-gray-300'
                                : 'bg-gray-200 text-gray-600'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span>{option}</span>
                          {answers[currentIndex] === option && (
                            <CheckCircle className="w-5 h-5 text-indigo-600 ml-auto" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentIndex < totalQuestions - 1 ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={!allAnswered || submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trophy className="w-4 h-4 mr-2" />
                  )}
                  Submit Quiz
                </Button>
              )}
            </div>

            {!allAnswered && currentIndex === totalQuestions - 1 && (
              <p className={`text-center mt-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Please answer all questions before submitting
              </p>
            )}

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

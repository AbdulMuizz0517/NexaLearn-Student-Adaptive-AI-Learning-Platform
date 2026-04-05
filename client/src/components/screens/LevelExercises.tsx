import { useState, useEffect } from "react";
import { 
  CheckCircle, XCircle, ArrowLeft, ArrowRight, 
  Loader2, Code, Lightbulb, Trophy, Send, RefreshCw, ClipboardCheck
} from "lucide-react";
import NavBar from "../NavBar";
import Sidebar from "../Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

interface LevelExercisesProps {
  level: 1 | 2 | 3;
  chapterProgress: {
    id: number;
    chapter_index: number;
    chapter_title: string;
  };
  topic: string;
  pathId: number;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
  onComplete: () => void;
}

interface Exercise {
  id: number;
  type: string;
  question?: string;
  code?: string;
  options?: string[];
  answer?: string;
  hint?: string;
  explanation?: string;
  title?: string;
  description?: string;
  starter_code?: string;
  blanks?: string[];
  solution?: string;
  test_cases?: Array<{ input: string; expected: string }>;
  hints?: string[];
  requirements?: string[];
}

interface ExerciseData {
  level: number;
  level_name: string;
  chapter: string;
  exercises: Exercise[];
  passing_score: number;
  time_limit_minutes: number;
}

interface AIReport {
  score: number;
  passed: boolean;
  total_correct: number;
  total_questions: number;
  feedback: string;
  question_results: Array<{
    question: string;
    user_answer: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string;
  }>;
  strengths: string[];
  areas_to_improve: string[];
  recommendation: string;
}

export default function LevelExercises({
  level,
  chapterProgress,
  topic,
  pathId,
  onNavigate,
  onBack,
  onComplete
}: LevelExercisesProps) {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const [exerciseData, setExerciseData] = useState<ExerciseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [codeInputs, setCodeInputs] = useState<Record<number, string>>({});
  const [report, setReport] = useState<AIReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userName = user?.full_name || user?.email?.split('@')[0] || 'Student';

  const levelTitles = {
    1: "Level 1: Dry Run (MCQs & Fill Blanks)",
    2: "Level 2: Complete the Code",
    3: "Level 3: Write the Code"
  };

  const levelGradients = {
    1: "linear-gradient(135deg, #3b82f6, #6366f1)",
    2: "linear-gradient(135deg, #f59e0b, #ea580c)",
    3: "linear-gradient(135deg, #8b5cf6, #7c3aed)"
  };

  useEffect(() => {
    fetchExercises();
  }, [level, chapterProgress.id]);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      setReady(false);
      const response = await axiosClient.get(
        `/progress/exercises/${chapterProgress.id}/level/${level}?topic=${encodeURIComponent(topic)}`
      );
      setExerciseData(response.data);
      if (level >= 2 && response.data?.exercises) {
        const initialCode: Record<number, string> = {};
        response.data.exercises.forEach((ex: Exercise, idx: number) => {
          initialCode[idx] = ex.starter_code || "";
        });
        setCodeInputs(initialCode);
      }
    } catch (err: any) {
      console.error("Failed to fetch exercises:", err);
      setError(err?.response?.data?.detail || "Failed to load exercises");
    } finally {
      setLoading(false);
    }
  };

  const currentExercise = exerciseData?.exercises?.[currentIndex];
  const totalExercises = exerciseData?.exercises?.length || 0;
  const progressValue = totalExercises > 0 ? ((currentIndex + 1) / totalExercises) * 100 : 0;

  const handleSelectOption = (option: string) => {
    if (submitted) return;
    setAnswers({ ...answers, [currentIndex]: option });
  };

  const handleFillBlank = (value: string) => {
    if (submitted) return;
    setAnswers({ ...answers, [currentIndex]: value });
  };

  const handleCodeChange = (value: string) => {
    if (submitted) return;
    setCodeInputs({ ...codeInputs, [currentIndex]: value });
  };

  const handleNext = () => {
    if (currentIndex < totalExercises - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowHint(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowHint(false);
    }
  };

  const answeredCount = level >= 2
    ? Object.values(codeInputs).filter(v => v.trim().length > 0).length
    : Object.keys(answers).length;
  const allAnswered = answeredCount >= totalExercises;

  const handleSubmitAll = async () => {
    if (!exerciseData || !user?.id) return;
    setSubmitting(true);
    try {
      const submissions = exerciseData.exercises.map((exercise, idx) => ({
        exercise_id: exercise.id,
        exercise_type: exercise.type,
        question: exercise.question || exercise.title || "",
        user_answer: level >= 2 ? (codeInputs[idx] || "") : (answers[idx] || ""),
        correct_answer: exercise.answer || exercise.solution || "",
        exercise_payload: exercise,
      }));

      const response = await axiosClient.post("/progress/exercises/submit-all", {
        user_id: user.id,
        topic_progress_id: chapterProgress.id,
        level,
        topic,
        chapter: chapterProgress.chapter_title,
        submissions
      });

      setReport(response.data);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Failed to submit:", err);
      setError("Failed to submit exercises. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteLevel = async () => {
    if (!user?.id || !report || !report.passed) return;
    try {
      await axiosClient.post(`/progress/level/complete?user_id=${user.id}&topic_progress_id=${chapterProgress.id}&level=${level}`);
      onComplete();
    } catch (err: any) {
      console.error("Failed to complete level:", err);
    }
  };

  const handleRetry = () => {
    setReport(null);
    setAnswers({});
    setCodeInputs({});
    setCurrentIndex(0);
    setSubmitted(false);
    setShowHint(false);
    setError(null);
    setReady(false);
    fetchExercises();
  };

  // ============ LOADING SCREEN ============
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
        <div className="text-center max-w-md">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-900"></div>
            <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Code className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Preparing Your Exercises
          </h2>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Our AI is generating personalized questions for{' '}
            <span className="font-semibold text-indigo-500">{chapterProgress.chapter_title}</span>
          </p>
          <div className="mt-4 flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============ READY SCREEN ============
  if (!ready && exerciseData) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
        <div className="text-center max-w-lg px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: levelGradients[level] }}>
            {level === 1 ? <ClipboardCheck className="w-10 h-10 text-white" strokeWidth={1.5} /> : <Code className="w-10 h-10 text-white" strokeWidth={1.5} />}
          </div>
          <h2 className={`text-3xl font-extrabold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {levelTitles[level]}
          </h2>
          <p className={`text-lg mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {chapterProgress.chapter_title}
          </p>
          <div className={`rounded-2xl p-5 mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <p className={`text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalExercises}</p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Questions</p>
              </div>
              <div>
                <p className={`text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{exerciseData.passing_score || 50}%</p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>To Pass</p>
              </div>
            </div>
          </div>
          <div className={`text-left rounded-2xl p-5 mb-8 ${isDarkMode ? 'bg-indigo-900/30 border border-indigo-700' : 'bg-indigo-50/80 border border-indigo-100'}`}>
            <p className={`font-bold mb-3 text-sm ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>How it works:</p>
            <ul className={`space-y-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• Answer all questions at your own pace</li>
              <li>• Navigate between questions freely</li>
              <li>• Submit all answers when ready</li>
              <li>• AI will evaluate and generate a detailed report</li>
            </ul>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onBack} className={isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : ''}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <button
              onClick={() => setReady(true)}
              className="inline-flex items-center gap-2 px-8 h-11 rounded-xl text-white font-semibold text-sm shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-[0.98]"
              style={{ background: levelGradients[level] }}
            >
              Start Level
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ REPORT SCREEN ============
  if (submitted && report) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
        <NavBar userName={userName} userRole="student" onLogout={logout} />
        <div className="flex">
          <Sidebar userRole="student" currentScreen="exercises" onNavigate={onNavigate} />
          <main className="flex-1 p-8">
            <div className="max-w-3xl mx-auto">
              <Card className={`text-center mb-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                <CardContent className="py-10">
                  {report.passed ? (
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                      <Trophy className="w-12 h-12 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
                      <RefreshCw className="w-12 h-12 text-orange-600" />
                    </div>
                  )}
                  <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {report.passed ? '🎉 Level Passed!' : 'Keep Practicing!'}
                  </h2>
                  <div className={`inline-block px-6 py-3 rounded-xl mb-4 ${report.passed ? 'bg-green-100' : 'bg-orange-100'}`}>
                    <span className={`text-4xl font-bold ${report.passed ? 'text-green-600' : 'text-orange-600'}`}>
                      {Math.round(report.score)}%
                    </span>
                  </div>
                  <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                    {report.total_correct} out of {report.total_questions} correct
                  </p>
                  <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{report.feedback}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {report.strengths && report.strengths.length > 0 && (
                  <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                    <CardHeader><CardTitle className={`text-lg ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>✅ Strengths</CardTitle></CardHeader>
                    <CardContent>
                      <ul className={`space-y-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {report.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                {report.areas_to_improve && report.areas_to_improve.length > 0 && (
                  <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                    <CardHeader><CardTitle className={`text-lg ${isDarkMode ? 'text-orange-400' : 'text-orange-700'}`}>📝 Areas to Improve</CardTitle></CardHeader>
                    <CardContent>
                      <ul className={`space-y-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {report.areas_to_improve.map((a, i) => <li key={i}>• {a}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card className={`mb-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                <CardHeader><CardTitle className={isDarkMode ? 'text-white' : ''}>Detailed Review</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.question_results?.map((qr, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border ${
                        qr.is_correct
                          ? isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'
                          : isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-start gap-3">
                          {qr.is_correct ? <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 mt-1 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Q{idx + 1}: {qr.question}</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Your answer: <span className={qr.is_correct ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{qr.user_answer || 'No answer'}</span>
                            </p>
                            {!qr.is_correct && (
                              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Correct: <span className="text-green-600 font-medium">{qr.correct_answer}</span>
                              </p>
                            )}
                            {qr.explanation && <p className={`text-sm mt-2 italic ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{qr.explanation}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {report.recommendation && (
                <Card className={`mb-6 ${isDarkMode ? 'bg-indigo-900/30 border-indigo-700' : 'bg-indigo-50 border-indigo-200'}`}>
                  <CardContent className="py-4">
                    <p className={`font-semibold mb-1 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>💡 AI Recommendation</p>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{report.recommendation}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center gap-4">
                {report.passed ? (
                  <Button onClick={handleCompleteLevel} className="bg-green-600 hover:bg-green-700">
                    <Trophy className="w-4 h-4 mr-2" />Continue
                  </Button>
                ) : (
                  <Button onClick={handleRetry} className="bg-orange-600 hover:bg-orange-700">
                    <RefreshCw className="w-4 h-4 mr-2" />Retry
                  </Button>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ============ MAIN EXERCISE VIEW ============
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole="student" onLogout={logout} />
      <div className="flex">
        <Sidebar userRole="student" currentScreen="exercises" onNavigate={onNavigate} />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Button variant="ghost" onClick={onBack} className={`mb-4 ${isDarkMode ? 'text-gray-300 hover:text-white' : ''}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />Back to Chapter
              </Button>
              <div className="p-5 rounded-2xl text-white mb-4 shadow-lg" style={{ background: levelGradients[level] }}>
                <h1 className="text-2xl font-bold tracking-tight">{levelTitles[level]}</h1>
                <p className="text-white/80 text-sm mt-1">{chapterProgress.chapter_title}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressValue}%`, background: levelGradients[level] }}
                  />
                </div>
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {currentIndex + 1}/{totalExercises}
                </span>
              </div>
              <div className="flex justify-center gap-2 mt-3 flex-wrap">
                {exerciseData?.exercises.map((_, index) => (
                  <button key={index} onClick={() => { setCurrentIndex(index); setShowHint(false); }}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                      currentIndex === index ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                        : (level >= 2 ? codeInputs[index]?.trim() : answers[index])
                          ? 'bg-green-500 text-white'
                          : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                    }`}>{index + 1}</button>
                ))}
              </div>
            </div>

            {currentExercise && (
              <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                      {level === 1 ? (currentExercise.type === 'mcq' ? 'Multiple Choice' : 'Fill in the Blank')
                        : level === 2 ? (currentExercise.title || 'Complete the Code')
                        : (currentExercise.title || 'Write the Code')}
                    </CardTitle>
                    {(currentExercise.hints?.length || currentExercise.hint) && (
                      <Button variant="ghost" size="sm" onClick={() => setShowHint(!showHint)} className="text-yellow-500">
                        <Lightbulb className="w-4 h-4 mr-1" />Hint
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    {level === 1 ? (
                      <>
                        <p className={`text-lg mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{currentExercise.question}</p>
                        {currentExercise.code && (
                          <pre className="p-4 rounded-lg overflow-x-auto mb-4 bg-gray-900 text-green-400"><code>{currentExercise.code}</code></pre>
                        )}
                      </>
                    ) : (
                      <>
                        <p className={`text-lg mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{currentExercise.description}</p>
                        {currentExercise.requirements && (
                          <div className="mb-4">
                            <p className={`font-semibold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Requirements:</p>
                            <ul className={`list-disc list-inside space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {currentExercise.requirements.map((req, i) => <li key={i}>{req}</li>)}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {showHint && (currentExercise.hint || currentExercise.hints) && (
                    <div className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} border border-yellow-500`}>
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5" />
                        <div className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>
                          {currentExercise.hint && <p>{currentExercise.hint}</p>}
                          {currentExercise.hints && <ul className="list-disc list-inside">{currentExercise.hints.map((h, i) => <li key={i}>{h}</li>)}</ul>}
                        </div>
                      </div>
                    </div>
                  )}

                  {level === 1 ? (
                    currentExercise.type === 'mcq' ? (
                      <div className="space-y-3">
                        {currentExercise.options?.map((option, index) => (
                          <button key={index} onClick={() => handleSelectOption(option)}
                            className={`w-full p-4 rounded-lg border text-left transition-all ${
                              answers[currentIndex] === option
                                ? isDarkMode ? 'bg-indigo-900/40 border-indigo-500 text-indigo-200' : 'bg-indigo-100 border-indigo-500 text-indigo-800'
                                : isDarkMode ? 'bg-gray-700 border-gray-600 hover:border-indigo-400 text-gray-200' : 'bg-white border-gray-200 hover:border-indigo-300 text-gray-800'
                            }`}>
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                                answers[currentIndex] === option ? 'bg-indigo-600 text-white' : isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                              }`}>{String.fromCharCode(65 + index)}</span>
                              <span>{option}</span>
                              {answers[currentIndex] === option && <CheckCircle className="w-5 h-5 text-indigo-600 ml-auto" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input type="text" value={answers[currentIndex] || ""} onChange={(e) => handleFillBlank(e.target.value)}
                        placeholder="Type your answer..."
                        className={`w-full p-4 rounded-lg border text-lg ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'}`}
                      />
                    )
                  ) : (
                    <div>
                      <div className={`rounded-lg overflow-hidden border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                        <div className={`px-4 py-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}><Code className="w-4 h-4 inline mr-2" />Code Editor</span>
                        </div>
                        <textarea value={codeInputs[currentIndex] || ""} onChange={(e) => handleCodeChange(e.target.value)}
                          rows={12} className="w-full p-4 font-mono text-sm bg-gray-900 text-green-400 focus:outline-none" placeholder="Write your code here..." />
                      </div>
                      {currentExercise.test_cases && (
                        <div className="mt-4">
                          <p className={`font-semibold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Test Cases:</p>
                          <div className="space-y-2">
                            {currentExercise.test_cases.map((tc, i) => (
                              <div key={i} className={`p-2 rounded text-sm ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Input:</span> {tc.input} → <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Expected:</span> {tc.expected}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}
                      className={isDarkMode ? 'border-gray-600 text-gray-300' : ''}>
                      <ArrowLeft className="w-4 h-4 mr-2" />Previous
                    </Button>
                    {currentIndex < totalExercises - 1 ? (
                      <Button onClick={handleNext}>Next<ArrowRight className="w-4 h-4 ml-2" /></Button>
                    ) : (
                      <Button onClick={handleSubmitAll} disabled={!allAnswered || submitting} className="bg-green-600 hover:bg-green-700">
                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Evaluating...</> : <><Send className="w-4 h-4 mr-2" />Submit All</>}
                      </Button>
                    )}
                  </div>

                  {!allAnswered && currentIndex === totalExercises - 1 && (
                    <p className={`text-center mt-4 text-sm ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      Answer all {totalExercises} questions before submitting ({answeredCount}/{totalExercises} answered)
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className={`mt-4 p-3 rounded-lg text-center ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{answeredCount}/{totalExercises} questions answered</span>
              {allAnswered && !submitted && <span className="ml-3 text-sm text-green-500 font-medium">✓ Ready to submit!</span>}
            </div>

            {error && <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}

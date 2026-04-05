import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Save, ChevronRight, Loader2, Trophy } from "lucide-react";
import NavBar from "../NavBar";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

interface QuizQuestionProps {
  topic: string;
  onComplete: (answers: number[]) => void;
  onExit: () => void;
  userRole: "student" | "teacher" | "admin" | null;
}

interface QuizQuestionData {
  id: number;
  question: string;
  code_snippet?: string;
  options: string[];
  answer: string;
}

export default function QuizQuestion({ topic, onComplete, onExit, userRole }: QuizQuestionProps) {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const latestFetchId = useRef(0);
  const questionCount = 10;
  const [questions, setQuestions] = useState<QuizQuestionData[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [questions.length]);

  useEffect(() => {
    let isActive = true;
    const requestId = ++latestFetchId.current;

    const fetchQuiz = async () => {
      try {
        setLoadingQuiz(true);
        setCurrentQuestion(0);
        setTimeLeft(25 * 60);
        setResultMessage(null);

        const response = await axiosClient.get<{ title: string; questions: QuizQuestionData[] }>(
          `/quiz/generate/${topic}?user_id=${user?.id || 0}&question_count=${questionCount}`
        );

        if (!isActive || requestId !== latestFetchId.current) {
          return;
        }

        const quizQuestions = response.data?.questions ?? [];
        setQuestions(quizQuestions);
        setSelectedAnswers(new Array(quizQuestions.length).fill(null));
      } catch (error: any) {
        if (!isActive || requestId !== latestFetchId.current) {
          return;
        }

        alert(error?.response?.data?.detail ?? "Failed to load quiz. Showing fallback questions.");
        const fallback = fallbackQuiz(topic, questionCount);
        setQuestions(fallback);
        setSelectedAnswers(new Array(fallback.length).fill(null));
      } finally {
        if (isActive && requestId === latestFetchId.current) {
          setLoadingQuiz(false);
        }
      }
    };

    fetchQuiz();

    return () => {
      isActive = false;
    };
  }, [topic, user?.id]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (submitting) return;
    const results = selectedAnswers.map((answerIndex, index) => {
      const selected = answerIndex !== null ? questions[index]?.options[answerIndex] : null;
      return selected && selected === questions[index]?.answer ? 1 : 0;
    });

    const detailedAttempts = selectedAnswers.map((answerIndex, index) => {
      const selected = answerIndex !== null ? questions[index]?.options[answerIndex] : "";
      const correct = questions[index]?.answer || "";
      return {
        question_id: questions[index]?.id || index + 1,
        question: questions[index]?.question || "",
        selected_answer: selected || "",
        correct_answer: correct,
        is_correct: !!selected && selected === correct,
      };
    });

    const correctCount = results.filter(val => val === 1).length;
    const scorePercent = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
    setSubmitting(true);

    try {
      if (user?.id) {
        const response = await axiosClient.post("/quiz/submit", {
          user_id: user.id,
          topic,
          answers: detailedAttempts,
        });
        
        // Show result with difficulty and path info
        const difficulty = response.data?.difficulty || "beginner";
        const passed = response.data?.passed;
        const profileSummary = response.data?.profile_summary;
        
        if (passed) {
          setResultMessage(`🎉 Score: ${scorePercent}% - ${difficulty.toUpperCase()} path generated. ${profileSummary || ''}`);
        } else {
          setResultMessage(`Score: ${scorePercent}% - ${profileSummary || `A ${difficulty} path has been created to help you improve.`}`);
        }
      }
    } catch (error: any) {
      alert(error?.response?.data?.detail ?? "Unable to submit quiz score.");
    } finally {
      setSubmitting(false);
    }

    onComplete(results);
  };

  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return ((currentQuestion + 1) / questions.length) * 100;
  }, [currentQuestion, questions.length]);

  if (loadingQuiz) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
        <Loader2 className="w-10 h-10 text-indigo-600 quiz-loader-spin mb-4" />
        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Fetching quiz questions...</p>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>No quiz questions available. Please try again later.</p>
      </div>
    );
  }

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Student';
  const topicLabelMap: Record<string, string> = {
    cpp: 'C++',
    csharp: 'C#',
    javascript: 'JavaScript',
    python: 'Python',
    java: 'Java',
    rust: 'Rust',
  };
  const topicLabel = topicLabelMap[topic.toLowerCase()] || topic.toUpperCase();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={displayName} userRole={userRole} />
      
      {/* Quiz Header */}
      <div className={`border-b px-8 py-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Quiz: {topicLabel}</h1>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Question {currentQuestion + 1} of {questions.length}</p>
            </div>
            <div className="flex items-center gap-3 text-xl">
              <Clock className={`w-6 h-6 ${timeLeft < 60 ? 'text-red-600' : 'text-gray-600'}`} />
              <span className={timeLeft < 60 ? 'text-red-600' : 'text-gray-900'}>{formatTime(timeLeft)}</span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
      
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Question Card */}
          <Card className="shadow-lg mb-6">
            <CardContent className="pt-8 pb-8">
              <h2 className={`text-2xl mb-8 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{questions[currentQuestion]?.question}</h2>

              {questions[currentQuestion]?.code_snippet && (
                <pre
                  className={`mb-6 overflow-x-auto rounded-lg border p-4 text-sm leading-relaxed ${
                    isDarkMode
                      ? 'border-gray-700 bg-gray-800 text-gray-100'
                      : 'border-gray-200 bg-gray-50 text-gray-900'
                  }`}
                >
                  <code>{questions[currentQuestion].code_snippet}</code>
                </pre>
              )}
              
              <RadioGroup 
                value={selectedAnswers[currentQuestion]?.toString()} 
                onValueChange={(value: string) => handleAnswerSelect(parseInt(value))}
              >
                <div className="space-y-4">
                  {questions[currentQuestion]?.options?.map((option, index) => (
                    <div 
                      key={index}
                      className={`flex items-center space-x-4 p-5 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedAnswers[currentQuestion] === index 
                          ? 'border-indigo-600 bg-indigo-50 shadow-md' 
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleAnswerSelect(index)}
                    >
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-lg">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
          
          {/* Navigation Buttons */}
          <div className="flex gap-4">
            <Button 
              variant="outline"
              onClick={onExit}
              size="lg"
              className="flex-1"
            >
              <Save className="w-5 h-5 mr-2" />
              Save & Exit
            </Button>
            
            <Button 
              onClick={handleNext}
              size="lg"
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              disabled={selectedAnswers[currentQuestion] === null || submitting}
            >
              {currentQuestion === questions.length - 1 ? (submitting ? "Submitting..." : "Submit Quiz") : "Next Question"}
              {currentQuestion < questions.length - 1 && <ChevronRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>
          
          {/* Question Navigator */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-gray-600 mb-3">Question Progress</p>
              <div className="flex flex-wrap gap-2">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      index === currentQuestion
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : selectedAnswers[index] !== null
                        ? 'border-green-600 bg-green-50 text-green-900'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {resultMessage && (
            <Card className="mt-6 border border-green-200 bg-green-50">
              <CardContent className="flex items-center gap-3 py-4 text-green-800">
                <Trophy className="w-6 h-6" />
                {resultMessage}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function fallbackQuiz(topic: string, total: number): QuizQuestionData[] {
  const label = topic.toUpperCase();
  const bank: QuizQuestionData[] = [
    { id: 1, question: `In ${label}, what is a variable?`, options: ["Named storage", "A compiler", "A package", "A loop"], answer: "Named storage" },
    { id: 2, question: `Why are functions useful in ${label}?`, options: ["Reusability", "More bugs", "Slower runtime always", "No debugging"], answer: "Reusability" },
    { id: 3, question: `Which is best practice in ${label} coding?`, options: ["Clear naming", "Long unreadable methods", "No testing", "Copy-paste logic"], answer: "Clear naming" },
    { id: 4, question: "What does debugging primarily do?", options: ["Find and fix defects", "Compile code", "Deploy app", "Write docs"], answer: "Find and fix defects" },
    { id: 5, question: "Which skill improves with regular coding practice?", options: ["Problem solving", "Battery life", "Internet speed", "Screen size"], answer: "Problem solving" },
    { id: 6, question: "Why use version control in development?", options: ["Track changes safely", "Increase RAM", "Replace coding", "Hide all bugs"], answer: "Track changes safely" },
    { id: 7, question: "What is an edge case?", options: ["Unusual input scenario", "Normal flow only", "A variable type", "A UI color"], answer: "Unusual input scenario" },
    { id: 8, question: "What helps maintainable code most?", options: ["Small focused modules", "Huge files", "No structure", "Random formatting"], answer: "Small focused modules" },
    { id: 9, question: "What is a reliable way to verify behavior?", options: ["Automated tests", "Guessing", "Skipping checks", "Ignoring outputs"], answer: "Automated tests" },
    { id: 10, question: "What should you do first when requirement changes?", options: ["Review impact and update design", "Ship immediately", "Delete tests", "Ignore requirement"], answer: "Review impact and update design" },
  ];

  return bank.slice(0, total);
}

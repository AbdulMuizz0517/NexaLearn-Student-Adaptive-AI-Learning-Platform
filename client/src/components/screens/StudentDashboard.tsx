import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, Award, Flame, BookOpen, Target, Loader2,
  Clock, ChevronRight, Play, Zap, AlertTriangle, Star,
  RefreshCw, CheckCircle2, XCircle, ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import NavBar from "../NavBar";
import Sidebar from "../Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

interface StudentDashboardProps {
  onNavigate: (screen: string, params?: any) => void;
}

interface LearningPathResponse {
  id: number;
  topic: string;
  generated_content: {
    title: string;
    chapters: { title: string; subchapters: string[] }[];
  } | string;
}

interface StudentSummary {
  user: { id: number; name: string };
  stats: {
    total_paths: number;
    total_chapters: number;
    completed_chapters: number;
    total_exercises_attempted: number;
    correct_exercises: number;
    overall_accuracy: number;
    overall_progress: number;
    estimated_learning_hours: number;
    streak_days: number;
    topics_mastered: string[];
    total_levels_completed: number;
  };
  current_chapters: {
    id: number;
    chapter_title: string;
    path_topic: string;
    levels_completed: number;
    next_step: string;
  }[];
  path_breakdowns: {
    path_id: number;
    topic: string;
    title: string;
    total_chapters: number;
    completed_chapters: number;
    progress_pct: number;
    current_chapter: string | null;
  }[];
  struggling_areas: { chapter: string; accuracy: number; attempts: number }[];
  strong_areas: { chapter: string; accuracy: number }[];
  recent_activity: {
    question: string;
    is_correct: boolean;
    level: number;
    type: string;
    date: string | null;
  }[];
  goals: { goal: string; priority: string; type: string }[];
}

interface Recommendation {
  type: string;
  title: string;
  description: string;
  priority: string;
  action?: string;
}

export default function StudentDashboard({ onNavigate }: StudentDashboardProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const userName = user?.full_name || user?.email?.split("@")[0] || "Student";
  const [paths, setPaths] = useState<LearningPathResponse[]>([]);
  const [loadingPaths, setLoadingPaths] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic data
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const { isDarkMode } = useTheme();

  const handleLogout = () => {
    logout();
    navigate("/");
    window.location.reload();
  };

  const normalizedPaths = useMemo(() => {
    const seen = new Set<number>();
    return paths
      .filter((path) => {
        if (seen.has(path.id)) return false;
        seen.add(path.id);
        return true;
      })
      .map((path) => {
        const content =
          typeof path.generated_content === "string"
            ? safeParseJSON(path.generated_content)
            : path.generated_content;
        return { ...path, generated_content: content } as LearningPathResponse;
      });
  }, [paths]);

  // Fetch learning paths
  useEffect(() => {
    if (!user?.id) return;
    const fetchPaths = async () => {
      try {
        setLoadingPaths(true);
        const response = await axiosClient.get<LearningPathResponse[]>(`/path/${user.id}`);
        setPaths(response.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.detail ?? "Unable to load learning paths.");
      } finally {
        setLoadingPaths(false);
      }
    };
    fetchPaths();
  }, [user?.id]);

  // Fetch dynamic summary
  useEffect(() => {
    if (!user?.id) return;
    const fetchSummary = async () => {
      try {
        setLoadingSummary(true);
        const res = await axiosClient.get<StudentSummary>(`/progress/student-summary/${user.id}`);
        setSummary(res.data);
      } catch (err) {
        console.error("Failed to fetch student summary", err);
      } finally {
        setLoadingSummary(false);
      }
    };
    fetchSummary();
  }, [user?.id]);

  // Fetch AI recommendations
  useEffect(() => {
    if (!user?.id) return;
    const fetchRecs = async () => {
      try {
        setLoadingRecs(true);
        const res = await axiosClient.get<{ recommendations: Recommendation[] }>(
          `/progress/recommendations/${user.id}`
        );
        setRecommendations(res.data.recommendations || []);
      } catch (err) {
        console.error("Failed to fetch recommendations", err);
      } finally {
        setLoadingRecs(false);
      }
    };
    fetchRecs();
  }, [user?.id]);

  const handleGeneratePath = async () => {
    if (!user?.id || generating) return;
    const topic = window.prompt("Enter a topic to study", "Python");
    if (!topic) return;
    try {
      setGenerating(true);
      const response = await axiosClient.post<LearningPathResponse>("/path/generate", {
        topic,
        score: 0,
        user_id: user.id,
      });
      setPaths((prev) => [response.data, ...prev]);
      setError(null);
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Failed to generate learning path.");
    } finally {
      setGenerating(false);
    }
  };

  const hasPaths = normalizedPaths.length > 0;
  const stats = summary?.stats;

  // Helper to get greeting based on time
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const priorityColor = (p: string) => {
    if (p === "high") return isDarkMode ? "text-red-400" : "text-red-600";
    if (p === "medium") return isDarkMode ? "text-yellow-400" : "text-yellow-600";
    return isDarkMode ? "text-blue-400" : "text-blue-600";
  };

  const recIcon = (type: string) => {
    switch (type) {
      case "practice": return <Zap className="w-5 h-5 text-yellow-500" />;
      case "review": return <RefreshCw className="w-5 h-5 text-orange-500" />;
      case "advance": return <ArrowRight className="w-5 h-5 text-green-500" />;
      case "explore": return <Star className="w-5 h-5 text-purple-500" />;
      case "get_started": return <Play className="w-5 h-5 text-indigo-500" />;
      default: return <Target className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 to-indigo-50"}`}>
      <NavBar userName={userName} userRole="student" onLogout={handleLogout} />

      <div className="flex">
        <Sidebar userRole="student" currentScreen="student-dashboard" onNavigate={onNavigate} />

        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className={`text-4xl mb-2 ${isDarkMode ? "text-white" : ""}`}>
                {getGreeting()}, {userName} 👋
              </h1>
              <p className={`text-xl ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                {stats && stats.streak_days > 0
                  ? `🔥 ${stats.streak_days}-day streak! Keep it going!`
                  : "Ready to learn today?"}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Accuracy */}
              <Card className={`shadow-md ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`mb-1 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Accuracy</p>
                      <p className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {stats ? `${stats.overall_accuracy}%` : "--"}
                      </p>
                      <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                        {stats ? `${stats.correct_exercises}/${stats.total_exercises_attempted} correct` : "No data yet"}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${
                      stats && stats.overall_accuracy >= 70
                        ? "bg-green-100 dark:bg-green-900/30"
                        : isDarkMode ? "bg-gray-700" : "bg-gray-100"
                    }`}>
                      <TrendingUp className={`w-8 h-8 ${
                        stats && stats.overall_accuracy >= 70 ? "text-green-500" : isDarkMode ? "text-gray-400" : "text-gray-400"
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Topics Mastered */}
              <Card className={`shadow-md ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`mb-1 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Chapters Done</p>
                      <p className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {stats ? stats.completed_chapters : 0}
                      </p>
                      <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                        {stats ? `of ${stats.total_chapters} total` : "Start learning!"}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${
                      stats && stats.completed_chapters > 0
                        ? "bg-yellow-100 dark:bg-yellow-900/30"
                        : isDarkMode ? "bg-gray-700" : "bg-gray-100"
                    }`}>
                      <Award className={`w-8 h-8 ${
                        stats && stats.completed_chapters > 0 ? "text-yellow-500" : "text-gray-400"
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Streak */}
              <Card className={`shadow-md ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`mb-1 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Streak</p>
                      <p className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {stats ? `${stats.streak_days}d` : "0d"}
                      </p>
                      <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                        {stats && stats.streak_days > 0 ? "Keep going!" : "Begin your streak!"}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${
                      stats && stats.streak_days > 0
                        ? "bg-orange-100 dark:bg-orange-900/30"
                        : isDarkMode ? "bg-gray-700" : "bg-gray-100"
                    }`}>
                      <Flame className={`w-8 h-8 ${
                        stats && stats.streak_days > 0 ? "text-orange-500" : "text-gray-400"
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Learning Hours */}
              <Card className={`shadow-md ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`mb-1 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Learning Hours</p>
                      <p className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {stats ? `${stats.estimated_learning_hours}h` : "--"}
                      </p>
                      <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                        {stats ? `${stats.total_levels_completed} levels completed` : "Estimated"}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-indigo-100"}`}>
                      <Clock className={`w-8 h-8 ${isDarkMode ? "text-indigo-400" : "text-indigo-500"}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overall Progress Bar */}
            {stats && (
              <Card className={`shadow-md mb-8 ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}>
                <CardContent className="pt-6">
                  <div className="flex justify-between mb-2">
                    <span className={`font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Overall Learning Progress
                    </span>
                    <span className={`font-bold ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>
                      {stats.overall_progress}%
                    </span>
                  </div>
                  <Progress value={stats.overall_progress} className="h-3" />
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>{stats.completed_chapters} chapters completed</span>
                    <span>{stats.total_levels_completed} levels done</span>
                    <span>{stats.total_exercises_attempted} exercises</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Goals Section */}
            {summary && summary.goals.length > 0 && (
              <Card className={`shadow-md mb-8 ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}>
                <CardHeader>
                  <CardTitle className={isDarkMode ? "text-white" : ""}>
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-500" /> Today's Goals
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summary.goals.map((g, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-50"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          g.priority === "high" ? "bg-red-500" : g.priority === "medium" ? "bg-yellow-500" : "bg-blue-500"
                        }`} />
                        <span className={`flex-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{g.goal}</span>
                        <span className={`text-xs font-medium uppercase ${priorityColor(g.priority)}`}>
                          {g.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Learning Path Section */}
            <Card className={`shadow-md mb-8 ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className={isDarkMode ? "text-white" : ""}>Your AI Learning Paths</CardTitle>
                  <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Personalized roadmaps from the AI tutor
                  </p>
                </div>
                <ButtonLike
                  onClick={handleGeneratePath}
                  disabled={generating}
                  label={generating ? "Generating..." : hasPaths ? "Generate New Path" : "Start Learning Journey"}
                />
              </CardHeader>
              <CardContent>
                {loadingPaths ? (
                  <div className={`flex items-center gap-3 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading your learning plans...
                  </div>
                ) : hasPaths ? (
                  <div className="space-y-4">
                    {normalizedPaths.map((path) => {
                      const breakdown = summary?.path_breakdowns?.find((b) => b.path_id === path.id);
                      return (
                        <div
                          key={path.id}
                          className={`p-4 rounded-lg border ${
                            isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"
                          } hover:shadow-md transition-shadow`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                {path.generated_content?.title ?? path.topic}
                              </h3>
                              <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                {breakdown
                                  ? `${breakdown.completed_chapters}/${breakdown.total_chapters} chapters • ${breakdown.progress_pct}% complete`
                                  : `${path.generated_content?.chapters?.length ?? 0} chapters`}
                              </p>
                              {breakdown?.current_chapter && (
                                <p className={`text-xs mt-1 ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>
                                  Currently: {breakdown.current_chapter}
                                </p>
                              )}
                            </div>
                            <Button
                              onClick={() =>
                                onNavigate("learning-path", { pathId: path.id, pathTopic: path.topic })
                              }
                              className="bg-indigo-600 hover:bg-indigo-700"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              {breakdown && breakdown.completed_chapters > 0 ? "Continue" : "Start"}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>

                          {/* Progress bar per path */}
                          {breakdown && (
                            <div className="mt-3">
                              <Progress value={breakdown.progress_pct} className="h-2" />
                            </div>
                          )}

                          {/* Chapter Preview */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {path.generated_content?.chapters?.slice(0, 4).map((chapter, idx) => (
                              <span
                                key={idx}
                                className={`px-3 py-1 rounded-full text-xs ${
                                  isDarkMode ? "bg-gray-600 text-gray-300" : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {chapter.title}
                              </span>
                            ))}
                            {(path.generated_content?.chapters?.length ?? 0) > 4 && (
                              <span
                                className={`px-3 py-1 rounded-full text-xs ${
                                  isDarkMode ? "bg-indigo-900 text-indigo-300" : "bg-indigo-100 text-indigo-600"
                                }`}
                              >
                                +{(path.generated_content?.chapters?.length ?? 0) - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`text-center ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    <p>No learning path yet.</p>
                    <p className="text-sm">Click "Start Learning Journey" to let the AI build one for you.</p>
                  </div>
                )}
                {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
                {generating && (
                  <div className="flex items-center gap-2 text-indigo-600 mt-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating your AI curriculum...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <Card className={`lg:col-span-2 shadow-md ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}>
                <CardHeader>
                  <CardTitle className={isDarkMode ? "text-white" : ""}>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary && summary.recent_activity.length > 0 ? (
                    <div className="space-y-2">
                      {summary.recent_activity.map((act, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            isDarkMode ? "bg-gray-700" : "bg-gray-50"
                          }`}
                        >
                          {act.is_correct ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                              {act.question || "Exercise"}
                            </p>
                            <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                              Level {act.level} • {act.type}
                              {act.date && ` • ${new Date(act.date).toLocaleDateString()}`}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${
                              act.is_correct
                                ? isDarkMode ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700"
                                : isDarkMode ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {act.is_correct ? "Correct" : "Incorrect"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-gray-400">
                      <Clock className="w-12 h-12 mb-3" />
                      <p className="text-lg">No activity yet</p>
                      <p className="text-sm">Start learning to see your activity here</p>
                    </div>
                  )}

                  {/* Progress bar */}
                  {stats && (
                    <div className="mt-6 space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>Overall Progress</span>
                          <span className={`font-bold ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>
                            {stats.overall_progress}%
                          </span>
                        </div>
                        <Progress value={stats.overall_progress} className="h-3" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Recommendations */}
              <Card className={`shadow-md ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}>
                <CardHeader>
                  <CardTitle className={isDarkMode ? "text-white" : ""}>
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" /> AI Recommendations
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingRecs ? (
                    <div className="flex items-center gap-2 text-gray-400 py-4">
                      <Loader2 className="w-4 h-4 animate-spin" /> Getting insights...
                    </div>
                  ) : recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border ${
                            isDarkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-100"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {recIcon(rec.type)}
                            <div className="flex-1">
                              <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                {rec.title}
                              </p>
                              <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                {rec.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <Target className="w-10 h-10 mb-3" />
                      <p className="text-center text-sm">Complete some exercises to get AI recommendations</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Strengths & Weaknesses Row */}
            {summary && (summary.struggling_areas.length > 0 || summary.strong_areas.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Struggling */}
                {summary.struggling_areas.length > 0 && (
                  <Card className={`shadow-md ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}>
                    <CardHeader>
                      <CardTitle className={isDarkMode ? "text-white" : ""}>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-orange-500" /> Needs Attention
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {summary.struggling_areas.map((area, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-orange-50"}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                {area.chapter}
                              </span>
                              <span className="text-sm text-orange-500 font-bold">{area.accuracy}%</span>
                            </div>
                            <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                              {area.attempts} attempts
                            </p>
                            <Progress value={area.accuracy} className="h-1.5 mt-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Strong */}
                {summary.strong_areas.length > 0 && (
                  <Card className={`shadow-md ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}>
                    <CardHeader>
                      <CardTitle className={isDarkMode ? "text-white" : ""}>
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5 text-green-500" /> Your Strengths
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {summary.strong_areas.map((area, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-green-50"}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                {area.chapter}
                              </span>
                              <span className="text-sm text-green-500 font-bold">{area.accuracy}%</span>
                            </div>
                            <Progress value={area.accuracy} className="h-1.5 mt-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Mastered Topics */}
            {stats && stats.topics_mastered.length > 0 && (
              <Card className={`mt-6 shadow-md ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}>
                <CardHeader>
                  <CardTitle className={isDarkMode ? "text-white" : ""}>
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-500" /> Mastered Topics
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stats.topics_mastered.map((t, i) => (
                      <span
                        key={i}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                          isDarkMode
                            ? "bg-green-900/30 text-green-400 border border-green-800"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        ✅ {t}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function safeParseJSON(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function ButtonLike({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-white text-sm font-semibold shadow disabled:opacity-60"
    >
      {label}
    </button>
  );
}

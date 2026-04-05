import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Users, AlertTriangle, MessageSquare, TrendingUp, 
  Eye, ChevronDown, ChevronUp,
  CheckCircle, Clock, User, BarChart3, FileDown
} from 'lucide-react';
import { useUserName } from '../../hooks/useUserName';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axiosClient from '../../api/axiosClient';

interface AdminDashboardProps {
  onNavigate: (screen: string, data?: any) => void;
  initialTab?: 'overview' | 'students' | 'flagged' | 'feedback' | 'reports';
}

interface Student {
  id: number;
  full_name: string;
  email: string;
  is_active?: boolean;
  total_paths?: number;
  total_chapters: number;
  completed_chapters: number;
  total_levels?: number;
  completed_levels?: number;
  average_score: number;
  is_struggling: boolean;
  struggling_topics: string[];
}

interface FlaggedStudent {
  id: number;
  full_name: string;
  email: string;
  struggling_topics: Array<{
    topic: string;
    chapter: string;
    level: number;
    attempts: number;
    failure_rate: number;
  }> | string[];
  overall_failure_rate?: number;
  severity?: 'low' | 'medium' | 'high';
}

interface Feedback {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  subject: string;
  message: string;
  category: string;
  is_read: boolean;
  admin_response: string | null;
  created_at: string;
}

interface Stats {
  total_students: number;
  active_students: number;
  struggling_students: number;
  total_paths: number;
  total_feedback: number;
  unread_feedback: number;
  average_completion_rate: number;
}

interface ReportStudentRow {
  id: number;
  full_name: string;
  email: string;
  average_score: number;
  completion_rate: number;
  completed_chapters: number;
  total_chapters: number;
  is_struggling: boolean;
  struggling_topics: string[];
}

interface ReportOverview {
  summary: {
    total_students: number;
    active_students: number;
    struggling_students: number;
    average_score: number;
  };
  top_performers: ReportStudentRow[];
  at_risk_students: ReportStudentRow[];
  monthly_activity: Array<{ label: string; submissions: number }>;
  students: ReportStudentRow[];
}

export default function AdminDashboard({ onNavigate, initialTab = 'overview' }: AdminDashboardProps) {
  const userName = useUserName();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'flagged' | 'feedback' | 'reports'>(initialTab);
  const [students, setStudents] = useState<Student[]>([]);
  const [flaggedStudents, setFlaggedStudents] = useState<FlaggedStudent[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);
  const [expandedFeedback, setExpandedFeedback] = useState<number | null>(null);
  const [remediationLoadingId, setRemediationLoadingId] = useState<number | null>(null);
  const [remediationMessage, setRemediationMessage] = useState<string>('');
  const [reportOverview, setReportOverview] = useState<ReportOverview | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, studentsRes, flaggedRes, feedbackRes, reportsRes] = await Promise.all([
        axiosClient.get('/admin/stats'),
        axiosClient.get('/admin/students'),
        axiosClient.get('/admin/flagged-students'),
        axiosClient.get('/admin/feedback'),
        axiosClient.get('/admin/reports/overview')
      ]);
      setStats(statsRes.data);
      // API returns { students: [...] } so extract the array
      setStudents(studentsRes.data.students || studentsRes.data || []);
      setFlaggedStudents(flaggedRes.data.flagged_students || flaggedRes.data || []);
      setFeedback(feedbackRes.data.feedback || feedbackRes.data || []);
      setReportOverview(reportsRes.data || null);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markFeedbackRead = async (feedbackId: number) => {
    try {
      await axiosClient.post(`/admin/feedback/${feedbackId}/mark-read`);
      fetchData();
    } catch (error) {
      console.error('Error marking feedback as read:', error);
    }
  };

  const exportReportCsv = () => {
    if (!reportOverview?.students?.length) return;
    const header = ['Student Name', 'Email', 'Average Score', 'Completion Rate', 'Completed Chapters', 'Total Chapters', 'Struggling'];
    const rows = reportOverview.students.map((row) => [
      row.full_name,
      row.email,
      row.average_score,
      row.completion_rate,
      row.completed_chapters,
      row.total_chapters,
      row.is_struggling ? 'Yes' : 'No',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    window.location.reload();
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const normalizeStrugglingTopics = (student: FlaggedStudent) => {
    return (student.struggling_topics || []).map((item: any) => {
      if (typeof item === 'string') {
        return {
          topic: item,
          chapter: 'Needs review',
          level: 1,
          attempts: 0,
          failure_rate: student.severity === 'high' ? 0.8 : student.severity === 'medium' ? 0.6 : 0.4,
        };
      }
      return {
        topic: item.topic || item.chapter || 'Topic review',
        chapter: item.chapter || item.topic || 'Needs review',
        level: item.level || 1,
        attempts: item.attempts || 0,
        failure_rate: item.failure_rate || (student.severity === 'high' ? 0.8 : student.severity === 'medium' ? 0.6 : 0.4),
      };
    });
  };

  const getOverallFailureRate = (student: FlaggedStudent) => {
    if (typeof student.overall_failure_rate === 'number') return student.overall_failure_rate;
    const topics = normalizeStrugglingTopics(student);
    if (!topics.length) return 0;
    return topics.reduce((sum, t) => sum + (t.failure_rate || 0), 0) / topics.length;
  };

  const triggerRemediation = async (student: FlaggedStudent) => {
    try {
      setRemediationLoadingId(student.id);
      setRemediationMessage('');
      await axiosClient.post(`/admin/student/${student.id}/remediation`);
      setRemediationMessage(`Remediation plan generated for ${student.full_name}.`);
      onNavigate('student-report', { student: { id: student.id, full_name: student.full_name, email: student.email } });
    } catch (error: any) {
      const detail = error?.response?.data?.detail || 'Failed to trigger remediation for this student.';
      setRemediationMessage(detail);
    } finally {
      setRemediationLoadingId(null);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole="admin" onLogout={handleLogout} />
      
      <div className="flex">
        <Sidebar userRole="admin" currentScreen="admin-dashboard" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className={`text-4xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Admin Dashboard
            </h1>

            {remediationMessage && (
              <div className={`mb-6 p-4 rounded-lg border ${isDarkMode ? 'bg-indigo-900/30 border-indigo-700 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-800'}`}>
                {remediationMessage}
              </div>
            )}

            {/* Notification Banners */}
            {stats && (stats.unread_feedback > 0 || stats.struggling_students > 0) && (
              <div className="flex flex-col gap-3 mb-6">
                {stats.struggling_students > 0 && (
                  <div className={`flex items-center gap-3 p-4 rounded-lg border-l-4 border-red-500 ${isDarkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className={`font-medium ${isDarkMode ? 'text-red-300' : 'text-red-800'}`}>
                      {stats.struggling_students} student{stats.struggling_students > 1 ? 's' : ''} flagged as struggling — 
                      <button className="underline ml-1" onClick={() => setActiveTab('flagged')}>View details</button>
                    </p>
                  </div>
                )}
                {stats.unread_feedback > 0 && (
                  <div className={`flex items-center gap-3 p-4 rounded-lg border-l-4 border-amber-500 ${isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
                    <MessageSquare className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <p className={`font-medium ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                      {stats.unread_feedback} unread feedback message{stats.unread_feedback > 1 ? 's' : ''} — 
                      <button className="underline ml-1" onClick={() => setActiveTab('feedback')}>Review now</button>
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Students</p>
                      <p className="text-3xl font-bold text-indigo-600">{stats?.total_students || 0}</p>
                    </div>
                    <div className="p-3 bg-indigo-100 rounded-lg">
                      <Users className="w-8 h-8 text-indigo-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Struggling Students</p>
                      <p className="text-3xl font-bold text-red-600">{stats?.struggling_students || 0}</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-lg">
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Unread Feedback</p>
                      <p className="text-3xl font-bold text-amber-600">{stats?.unread_feedback || 0}</p>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-lg">
                      <MessageSquare className="w-8 h-8 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Completion</p>
                      <p className="text-3xl font-bold text-green-600">{stats?.average_completion_rate?.toFixed(0) || 0}%</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {[
                { id: 'overview', label: 'Overview', icon: Eye },
                { id: 'students', label: 'All Students', icon: Users },
                { id: 'flagged', label: 'Flagged Students', icon: AlertTriangle, count: flaggedStudents.length },
                { id: 'feedback', label: 'Feedback', icon: MessageSquare, count: stats?.unread_feedback },
                { id: 'reports', label: 'Reports', icon: BarChart3 }
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'outline'}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className="flex items-center gap-2"
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {tab.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>
            
            {loading ? (
              <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                <CardContent className="py-12 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading data...</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Flagged Students */}
                    <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Students Needing Help
                          </h2>
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        {flaggedStudents.length === 0 ? (
                          <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No struggling students 🎉
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {flaggedStudents.slice(0, 5).map(student => {
                              const topics = normalizeStrugglingTopics(student);
                              const overallFailureRate = getOverallFailureRate(student);
                              return (
                              <div 
                                key={student.id}
                                className={`p-3 rounded-lg border-l-4 border-red-500 ${
                                  isDarkMode ? 'bg-red-900/20' : 'bg-red-50'
                                }`}
                              >
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {student.full_name}
                                </p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  Struggling with: {topics.map(t => t.topic).slice(0, 2).join(', ')}
                                  {topics.length > 2 && ` +${topics.length - 2} more`}
                                </p>
                                <p className="text-xs text-red-500 mt-1">
                                  {(overallFailureRate * 100).toFixed(0)}% failure rate
                                </p>
                              </div>
                            );})}
                          </div>
                        )}
                        {flaggedStudents.length > 5 && (
                          <Button 
                            variant="ghost" 
                            className="w-full mt-4"
                            onClick={() => setActiveTab('flagged')}
                          >
                            View All ({flaggedStudents.length})
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* Recent Feedback */}
                    <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Recent Feedback
                          </h2>
                          <MessageSquare className="w-5 h-5 text-amber-500" />
                        </div>
                        {feedback.length === 0 ? (
                          <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No feedback yet
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {feedback.slice(0, 5).map(fb => (
                              <div 
                                key={fb.id}
                                className={`p-3 rounded-lg ${
                                  fb.is_read 
                                    ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-50')
                                    : (isDarkMode ? 'bg-amber-900/20 border-l-4 border-amber-500' : 'bg-amber-50 border-l-4 border-amber-500')
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {fb.subject}
                                  </p>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    fb.category === 'bug' ? 'bg-red-100 text-red-700' :
                                    fb.category === 'feature' ? 'bg-blue-100 text-blue-700' :
                                    fb.category === 'content' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {fb.category}
                                  </span>
                                </div>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  From: {fb.user_name}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        {feedback.length > 5 && (
                          <Button 
                            variant="ghost" 
                            className="w-full mt-4"
                            onClick={() => setActiveTab('feedback')}
                          >
                            View All ({feedback.length})
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* All Students Tab */}
                {activeTab === 'students' && (
                  <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                    <CardContent className="pt-6">
                      <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        All Students ({students.length})
                      </h2>
                      {students.length === 0 ? (
                        <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          No students registered yet
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {students.map(student => (
                            <div 
                              key={student.id}
                              className={`rounded-lg border ${
                                student.is_struggling 
                                  ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                                  : isDarkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-white'
                              }`}
                            >
                              <div 
                                className="p-4 cursor-pointer"
                                onClick={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                      student.is_struggling ? 'bg-red-200' : 'bg-indigo-100'
                                    }`}>
                                      <User className={`w-5 h-5 ${student.is_struggling ? 'text-red-600' : 'text-indigo-600'}`} />
                                    </div>
                                    <div>
                                      <p className={`font-medium flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {student.full_name}
                                        {student.is_struggling && (
                                          <AlertTriangle className="w-4 h-4 text-red-500" />
                                        )}
                                      </p>
                                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {student.email}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Progress
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                          <div 
                                            className={`h-full ${getProgressColor(
                                              student.total_chapters > 0 
                                                ? (student.completed_chapters / student.total_chapters) * 100 
                                                : 0
                                            )}`}
                                            style={{ 
                                              width: `${student.total_chapters > 0 
                                                ? (student.completed_chapters / student.total_chapters) * 100 
                                                : 0}%` 
                                            }}
                                          />
                                        </div>
                                        <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : ''}`}>
                                          {student.total_chapters > 0 
                                            ? ((student.completed_chapters / student.total_chapters) * 100).toFixed(0)
                                            : 0}%
                                        </span>
                                      </div>
                                    </div>
                                    {expandedStudent === student.id ? (
                                      <ChevronUp className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                                    ) : (
                                      <ChevronDown className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {expandedStudent === student.id && (
                                <div className={`px-4 pb-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                  <div className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chapters Progress</p>
                                      <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : ''}`}>
                                        {student.completed_chapters}/{student.total_chapters}
                                      </p>
                                    </div>
                                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Score</p>
                                      <p className={`text-xl font-bold ${
                                        student.average_score >= 70 ? 'text-green-600' :
                                        student.average_score >= 50 ? 'text-amber-600' : 'text-red-600'
                                      }`}>
                                        {student.average_score?.toFixed(0) || 0}%
                                      </p>
                                    </div>
                                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</p>
                                      <p className={`text-xl font-bold ${student.is_struggling ? 'text-red-600' : 'text-green-600'}`}>
                                        {student.is_struggling ? 'Needs Help' : 'On Track'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {student.struggling_topics && student.struggling_topics.length > 0 && (
                                    <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                                      <p className="text-sm font-medium text-red-600 mb-2">Struggling Topics:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {student.struggling_topics.map((topic, idx) => (
                                          <span 
                                            key={idx}
                                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded"
                                          >
                                            {topic}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="mt-4">
                                    <Button 
                                      size="sm" 
                                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white"
                                      onClick={() => onNavigate('student-report', { student: { id: student.id, full_name: student.full_name, email: student.email } })}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />View AI Report
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Flagged Students Tab */}
                {activeTab === 'flagged' && (
                  <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                        <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Flagged Students ({flaggedStudents.length})
                        </h2>
                      </div>
                      <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Students with more than 50% failure rate on any topic
                      </p>
                      
                      {flaggedStudents.length === 0 ? (
                        <div className="text-center py-12">
                          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                          <p className={`text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            All students are doing well!
                          </p>
                          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            No struggling students at the moment
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {flaggedStudents.map(student => {
                            const topics = normalizeStrugglingTopics(student);
                            const overallFailureRate = getOverallFailureRate(student);
                            return (
                            <div 
                              key={student.id}
                              className={`rounded-lg border-2 border-red-300 ${
                                isDarkMode ? 'bg-red-900/20' : 'bg-red-50'
                              }`}
                            >
                              <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-red-200 flex items-center justify-center">
                                      <AlertTriangle className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div>
                                      <p className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {student.full_name}
                                      </p>
                                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {student.email}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-red-600">
                                      {(overallFailureRate * 100).toFixed(0)}%
                                    </p>
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      Overall Failure Rate
                                    </p>
                                  </div>
                                </div>
                                
                                <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                  <p className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Struggling Areas:
                                  </p>
                                  <div className="space-y-2">
                                    {topics.map((topic, idx) => (
                                      <div 
                                        key={idx}
                                        className={`flex items-center justify-between p-2 rounded ${
                                          isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                                        }`}
                                      >
                                        <div>
                                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            {topic.topic} - {topic.chapter}
                                          </p>
                                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Level {topic.level}{topic.attempts > 0 ? ` • ${topic.attempts} attempts` : ''}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className={`font-bold ${
                                            topic.failure_rate > 0.7 ? 'text-red-600' : 'text-amber-600'
                                          }`}>
                                            {(topic.failure_rate * 100).toFixed(0)}% failed
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Action Buttons for Flagged Students */}
                                <div className={`px-4 pb-4 pt-2 flex items-center gap-3 justify-end ${isDarkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className={`${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}`}
                                    onClick={() => onNavigate('student-report', { student: { id: student.id, full_name: student.full_name, email: student.email } })}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />View AI Report
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={() => triggerRemediation(student)}
                                    disabled={remediationLoadingId === student.id}
                                  >
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    {remediationLoadingId === student.id ? 'Triggering...' : 'Initiate Remediation'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );})}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Reports Tab */}
                {activeTab === 'reports' && (
                  <div className="space-y-6">
                    <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                      <CardContent className="pt-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Admin Reporting Overview
                          </h2>
                          <Button onClick={exportReportCsv} className="bg-indigo-600 hover:bg-indigo-700">
                            <FileDown className="w-4 h-4 mr-2" /> Export CSV
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Students</p>
                            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{reportOverview?.summary?.total_students ?? 0}</p>
                          </div>
                          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active Students</p>
                            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{reportOverview?.summary?.active_students ?? 0}</p>
                          </div>
                          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Score</p>
                            <p className="text-2xl font-bold text-green-600">{Math.round(reportOverview?.summary?.average_score ?? 0)}%</p>
                          </div>
                          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>At Risk</p>
                            <p className="text-2xl font-bold text-red-600">{reportOverview?.summary?.struggling_students ?? 0}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Top Performers</h3>
                            <div className="space-y-2">
                              {(reportOverview?.top_performers || []).slice(0, 5).map((student) => (
                                <div key={student.id} className={`p-3 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-700/60' : 'border-gray-200 bg-white'}`}>
                                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{student.full_name}</p>
                                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{student.email}</p>
                                  <p className="text-sm text-green-600 mt-1">Score: {Math.round(student.average_score)}% • Completion: {Math.round(student.completion_rate)}%</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>At-Risk Students</h3>
                            <div className="space-y-2">
                              {(reportOverview?.at_risk_students || []).slice(0, 5).map((student) => (
                                <div key={student.id} className={`p-3 rounded-lg border ${isDarkMode ? 'border-red-700 bg-red-900/20' : 'border-red-200 bg-red-50'}`}>
                                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{student.full_name}</p>
                                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{student.email}</p>
                                  <p className="text-sm text-red-600 mt-1">Score: {Math.round(student.average_score)}% • Completion: {Math.round(student.completion_rate)}%</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6">
                          <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Monthly Activity</h3>
                          <div className="space-y-2">
                            {(reportOverview?.monthly_activity || []).map((row) => {
                              const max = Math.max(...(reportOverview?.monthly_activity || []).map((m) => m.submissions), 1);
                              const pct = Math.round((row.submissions / max) * 100);
                              return (
                                <div key={row.label} className="flex items-center gap-3">
                                  <span className={`w-20 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{row.label}</span>
                                  <div className={`flex-1 h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{row.submissions}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Feedback Tab */}
                {activeTab === 'feedback' && (
                  <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                    <CardContent className="pt-6">
                      <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Student Feedback ({feedback.length})
                      </h2>
                      
                      {feedback.length === 0 ? (
                        <div className="text-center py-12">
                          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className={`text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            No feedback yet
                          </p>
                          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Students can submit feedback through their dashboard
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {feedback.map(fb => (
                            <div 
                              key={fb.id}
                              className={`rounded-lg border ${
                                fb.is_read 
                                  ? isDarkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-white'
                                  : isDarkMode ? 'border-amber-700 bg-amber-900/20' : 'border-amber-300 bg-amber-50'
                              }`}
                            >
                              <div 
                                className="p-4 cursor-pointer"
                                onClick={() => setExpandedFeedback(expandedFeedback === fb.id ? null : fb.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {!fb.is_read && (
                                      <div className="w-2 h-2 bg-amber-500 rounded-full" />
                                    )}
                                    <div>
                                      <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {fb.subject}
                                      </p>
                                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        From: {fb.user_name} ({fb.user_email})
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      fb.category === 'bug' ? 'bg-red-100 text-red-700' :
                                      fb.category === 'feature' ? 'bg-blue-100 text-blue-700' :
                                      fb.category === 'content' ? 'bg-purple-100 text-purple-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {fb.category}
                                    </span>
                                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      <Clock className="w-3 h-3 inline mr-1" />
                                      {formatDate(fb.created_at)}
                                    </span>
                                    {expandedFeedback === fb.id ? (
                                      <ChevronUp className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                                    ) : (
                                      <ChevronDown className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {expandedFeedback === fb.id && (
                                <div className={`px-4 pb-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                  <div className="pt-4">
                                    <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                      Message:
                                    </p>
                                    <p className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} ${isDarkMode ? 'text-white' : ''}`}>
                                      {fb.message}
                                    </p>
                                    
                                    {!fb.is_read && (
                                      <div className="mt-4">
                                        <Button 
                                          variant="outline"
                                          onClick={() => markFeedbackRead(fb.id)}
                                          className="flex items-center gap-2"
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                          Mark as Reviewed
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

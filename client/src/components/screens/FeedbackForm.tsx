import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { 
  MessageSquare, Send, Trash2, Clock, CheckCircle, 
  AlertCircle, Bug, Lightbulb, BookOpen, HelpCircle
} from 'lucide-react';
import { useUserName } from '../../hooks/useUserName';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axiosClient from '../../api/axiosClient';

interface FeedbackFormProps {
  onNavigate: (screen: string) => void;
}

interface MyFeedback {
  id: number;
  subject: string;
  message: string;
  category: string;
  is_read: boolean;
  admin_response: string | null;
  created_at: string;
}

const categories = [
  { id: 'general', label: 'General', icon: HelpCircle, color: 'text-gray-600' },
  { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-600' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-blue-600' },
  { id: 'content', label: 'Content Issue', icon: BookOpen, color: 'text-purple-600' },
];

export default function FeedbackForm({ onNavigate }: FeedbackFormProps) {
  const userName = useUserName();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'submit' | 'my-feedback'>('submit');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [myFeedback, setMyFeedback] = useState<MyFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackFetchError, setFeedbackFetchError] = useState('');

  useEffect(() => {
    if (activeTab === 'my-feedback' && user?.id) {
      fetchMyFeedback();
    }
  }, [activeTab, user?.id]);

  const fetchMyFeedback = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setFeedbackFetchError('');
      const response = await axiosClient.get(`/feedback/my-feedback/${user.id}`);
      const data = response.data;
      setMyFeedback(Array.isArray(data) ? data : data.feedback || []);
    } catch (err: any) {
      console.error('Error fetching feedback:', err);
      setFeedbackFetchError(err?.response?.data?.detail || 'Unable to load your feedback right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (!user?.id) {
      setError('You must be logged in to submit feedback');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await axiosClient.post('/feedback/submit', {
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim(),
        category
      });
      setSuccess(true);
      setSubject('');
      setMessage('');
      setCategory('general');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (feedbackId: number) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    try {
      await axiosClient.delete(`/feedback/${feedbackId}?user_id=${user?.id}`);
      fetchMyFeedback();
    } catch (err) {
      console.error('Error deleting feedback:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    window.location.reload();
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

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole="student" onLogout={handleLogout} />
      
      <div className="flex">
        <Sidebar userRole="student" currentScreen="feedback" onNavigate={onNavigate} />
        
        <main className="flex-1 p-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className={`w-8 h-8 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Feedback
              </h1>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={activeTab === 'submit' ? 'default' : 'outline'}
                onClick={() => setActiveTab('submit')}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit Feedback
              </Button>
              <Button
                variant={activeTab === 'my-feedback' ? 'default' : 'outline'}
                onClick={() => setActiveTab('my-feedback')}
                className="flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                My Feedback
              </Button>
            </div>

            {/* Submit Feedback Tab */}
            {activeTab === 'submit' && (
              <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                <CardContent className="pt-6">
                  <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Share Your Thoughts
                  </h2>
                  <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Have a suggestion, found a bug, or want to share your experience? We'd love to hear from you!
                  </p>

                  {success && (
                    <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded-lg flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-green-700">Thank you! Your feedback has been submitted successfully.</p>
                    </div>
                  )}

                  {error && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <p className="text-red-700">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Category Selection */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Category
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategory(cat.id)}
                            className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                              category === cat.id
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                : isDarkMode 
                                  ? 'border-gray-700 hover:border-gray-600' 
                                  : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <cat.icon className={`w-5 h-5 ${cat.color}`} />
                            <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                              {cat.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Subject
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief summary of your feedback"
                        className={`w-full p-3 rounded-lg border ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 placeholder-gray-500'
                        }`}
                        maxLength={100}
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Message
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe your feedback in detail..."
                        rows={5}
                        className={`w-full p-3 rounded-lg border ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 placeholder-gray-500'
                        }`}
                        maxLength={1000}
                      />
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {message.length}/1000 characters
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting || !subject.trim() || !message.trim()}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Feedback
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* My Feedback Tab */}
            {activeTab === 'my-feedback' && (
              <Card className={`shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                <CardContent className="pt-6">
                  <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    My Submitted Feedback
                  </h2>

                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                      <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</p>
                    </div>
                  ) : !user?.id ? (
                    <div className="text-center py-12">
                      <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                      <p className={`text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Please log in to view your feedback
                      </p>
                    </div>
                  ) : feedbackFetchError ? (
                    <div className="text-center py-12">
                      <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                      <p className={`text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Could not load feedback
                      </p>
                      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {feedbackFetchError}
                      </p>
                      <Button onClick={fetchMyFeedback} className="mt-4">
                        Retry
                      </Button>
                    </div>
                  ) : myFeedback.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className={`text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        No feedback submitted yet
                      </p>
                      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Share your thoughts with us!
                      </p>
                      <Button
                        onClick={() => setActiveTab('submit')}
                        className="mt-4"
                      >
                        Submit Feedback
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myFeedback.map(fb => (
                        <div 
                          key={fb.id}
                          className={`rounded-lg border p-4 ${
                            isDarkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {fb.subject}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  fb.category === 'bug' ? 'bg-red-100 text-red-700' :
                                  fb.category === 'feature' ? 'bg-blue-100 text-blue-700' :
                                  fb.category === 'content' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {fb.category}
                                </span>
                                <span className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  <Clock className="w-3 h-3" />
                                  {formatDate(fb.created_at)}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(fb.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {fb.message}
                          </p>

                          {fb.is_read ? (
                            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'} flex items-center gap-2`}>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <p className={`text-sm font-medium text-green-600`}>
                                Reviewed ✓
                              </p>
                            </div>
                          ) : (
                            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} flex items-center gap-2`}>
                              <Clock className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Pending review
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

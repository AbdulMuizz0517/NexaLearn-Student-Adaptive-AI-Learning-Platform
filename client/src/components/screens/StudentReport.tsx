import { useState, useEffect, useRef } from 'react';
import NavBar from '../NavBar';
import Sidebar from '../Sidebar';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ArrowLeft, Brain, AlertTriangle, Loader2, Star, TrendingUp, Target, FileDown, CalendarDays, UserRound, BadgeCheck } from 'lucide-react';
import { useUserName, useLogout } from '../../hooks/useUserName';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface StudentReportProps {
  student?: any;
  onNavigate: (screen: string, data?: any) => void;
  onBack?: () => void;
}

interface AIReport {
  overall_grade: string;
  overall_score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  chapter_analysis: Array<{ chapter: string; performance: string; notes: string }>;
  recommendations: string[];
  learning_style_notes: string;
  predicted_areas_of_difficulty: string[];
}

interface ReportData {
  student: { id: number; full_name: string; email: string };
  struggling_topics: string[];
  report: AIReport;
}

export default function StudentReport({ student, onNavigate, onBack }: StudentReportProps) {
  const userName = useUserName();
  const handleLogout = useLogout();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date>(new Date());

  // Support self-view: use logged-in user when no student prop
  const effectiveStudent = student || (user ? { id: user.id, full_name: user.full_name || user.email, email: user.email } : null);
  const isSelfView = !student && !!user;
  const viewRole = isSelfView ? 'student' : 'admin';

  useEffect(() => {
    if (effectiveStudent?.id) {
      fetchReport();
    }
  }, [effectiveStudent?.id]);

  const fetchReport = async () => {
    if (!effectiveStudent?.id) return;
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const [reportRes, progressRes] = await Promise.all([
        axiosClient.get(`/admin/student/${effectiveStudent.id}/report`, { signal: controller.signal }),
        axiosClient.get(`/admin/student/${effectiveStudent.id}/progress`, { signal: controller.signal })
      ]);
      setReportData(reportRes.data);
      setProgressData(progressRes.data);
      setGeneratedAt(new Date());
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        setError('Report generation timed out. The AI service may be slow. Please try again.');
      } else {
        console.error("Failed to fetch report:", err);
        setError(err?.response?.data?.detail || "Failed to generate report");
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const perfColor = (perf: string) => {
    const p = perf.toLowerCase();
    if (p.includes('excellent')) return isDarkMode ? 'bg-green-900/30 border-green-700 text-green-300' : 'bg-green-50 border-green-200 text-green-800';
    if (p.includes('good')) return isDarkMode ? 'bg-blue-900/30 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800';
    if (p.includes('needs')) return isDarkMode ? 'bg-yellow-900/30 border-yellow-700 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return isDarkMode ? 'bg-red-900/30 border-red-700 text-red-300' : 'bg-red-50 border-red-200 text-red-800';
  };

  const studentName = reportData?.student?.full_name || effectiveStudent?.full_name || 'Student';
  const chapterRows = progressData?.chapters || [];
  const completedChapters = chapterRows.filter((c: any) => c.chapter_quiz_passed).length;
  const completionRate = chapterRows.length > 0 ? Math.round((completedChapters / chapterRows.length) * 100) : 0;
  const normalizedGrade = (reportData?.report?.overall_grade || '').trim();
  const displayGrade = normalizedGrade && normalizedGrade.toLowerCase() !== 'n/a' ? normalizedGrade : 'In Progress';
  const baseScore = typeof reportData?.report?.overall_score === 'number' ? reportData.report.overall_score : 0;
  const chapterScoreCandidates = chapterRows
    .map((row: any) => row.chapter_quiz_score)
    .filter((score: any) => typeof score === 'number');
  const averageChapterScore = chapterScoreCandidates.length > 0
    ? chapterScoreCandidates.reduce((sum: number, score: number) => sum + score, 0) / chapterScoreCandidates.length
    : 0;
  const displayScoreValue = baseScore > 0 ? baseScore : averageChapterScore;

  const formatReportDate = (value: Date) =>
    value.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const downloadPdf = async () => {
    if (!reportRef.current || !reportData) return;
    try {
      setDownloadingPdf(true);

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: reportRef.current.scrollWidth,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageWidth = pageWidth;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;

      let remainingHeight = imageHeight;
      let yOffset = 0;

      pdf.addImage(imgData, 'PNG', 0, yOffset, imageWidth, imageHeight, undefined, 'FAST');
      remainingHeight -= pageHeight;

      while (remainingHeight > 0) {
        yOffset = remainingHeight - imageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, yOffset, imageWidth, imageHeight, undefined, 'FAST');
        remainingHeight -= pageHeight;
      }

      const safeStudentName = studentName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'student';
      const dateStamp = new Date().toISOString().slice(0, 10);
      pdf.save(`${safeStudentName}_performance_report_${dateStamp}.pdf`);
    } catch (pdfError) {
      console.error('Failed to download PDF:', pdfError);
      alert('Unable to generate PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    onNavigate(isSelfView ? 'student-dashboard' : 'admin-dashboard');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <NavBar userName={userName} userRole={viewRole} onLogout={handleLogout} />
      <div className="flex">
        <Sidebar userRole={viewRole} currentScreen="student-report" onNavigate={onNavigate} />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" onClick={handleBack} className={isDarkMode ? 'text-gray-300' : ''}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
              </Button>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={fetchReport} className={isDarkMode ? 'border-gray-600 text-gray-300' : ''}>
                  Regenerate Report
                </Button>
                <Button
                  onClick={downloadPdf}
                  disabled={downloadingPdf}
                  className="text-white hover:opacity-90"
                  style={{ backgroundColor: '#111827', border: '1px solid #111827' }}
                >
                  {downloadingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                  {downloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
                <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Generating AI report for {studentName}...
                </p>
                <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  This may take a few moments
                </p>
              </div>
            ) : error ? (
              <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
                <CardContent className="py-10 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{error}</p>
                  <Button onClick={fetchReport} className="mt-4">Retry</Button>
                </CardContent>
              </Card>
            ) : reportData ? (
              <div ref={reportRef} className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-2xl">
                <section
                  className="px-8 py-8 text-white"
                  style={{ background: 'linear-gradient(120deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="uppercase tracking-[0.18em] text-xs text-slate-300">NexaLearn Analytics</p>
                      <h1 className="text-3xl font-bold mt-2">Student Performance Report</h1>
                      <p className="text-slate-300 mt-2">Prepared for instructional review and academic planning</p>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="flex items-center gap-2 justify-end"><CalendarDays className="w-4 h-4" /> {formatReportDate(generatedAt)}</div>
                      <div className="flex items-center gap-2 justify-end mt-1"><UserRound className="w-4 h-4" /> {studentName}</div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-800/70 rounded-lg px-4 py-3">
                      <p className="text-slate-400">Student Email</p>
                      <p className="text-white font-medium">{reportData.student.email}</p>
                    </div>
                    <div className="bg-slate-800/70 rounded-lg px-4 py-3">
                      <p className="text-slate-400">View Mode</p>
                      <p className="text-white font-medium">{isSelfView ? 'Self Progress Review' : 'Teacher/Admin Review'}</p>
                    </div>
                  </div>
                </section>

                <section className="px-8 py-6 border-b border-slate-200">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Overall Grade</p>
                      <p className="text-3xl font-bold text-slate-900 mt-2">{displayGrade}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Overall Score</p>
                      <p className="text-3xl font-bold text-slate-900 mt-2">{`${Math.round(displayScoreValue)}%`}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Completion Rate</p>
                      <p className="text-3xl font-bold text-slate-900 mt-2">{completionRate}%</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Chapters Passed</p>
                      <p className="text-3xl font-bold text-slate-900 mt-2">{completedChapters}/{chapterRows.length || 0}</p>
                    </div>
                  </div>
                </section>

                <section className="px-8 py-7 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Executive Summary</h2>
                  <p className="text-slate-700 leading-7 pl-3 border-l-4 border-indigo-200">{reportData.report.summary || 'Performance data is still being collected. Continue attempts to generate deeper analytics.'}</p>
                </section>

                {reportData.struggling_topics?.length > 0 && (
                  <section className="px-8 py-6 border-b border-slate-200 bg-red-50/60">
                    <div className="flex items-center gap-2 mb-3 text-red-800 font-semibold">
                      <AlertTriangle className="w-5 h-5" /> Critical Support Areas
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {reportData.struggling_topics.map((topic, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700 border border-red-200">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <section className="px-8 py-7 border-b border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                      <h3 className="font-semibold text-emerald-800 flex items-center gap-2 mb-3"><Star className="w-4 h-4" /> Strength Highlights</h3>
                      <ul className="space-y-2 text-emerald-900 text-sm leading-6">
                        {(reportData.report.strengths || []).length > 0 ? (
                          (reportData.report.strengths || []).map((item, idx) => (
                            <li key={idx} className="flex gap-2"><BadgeCheck className="w-4 h-4 mt-0.5 shrink-0" /> {item}</li>
                          ))
                        ) : (
                          <li>No strengths captured yet.</li>
                        )}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                      <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4" /> Growth Opportunities</h3>
                      <ul className="space-y-2 text-amber-900 text-sm leading-6">
                        {(reportData.report.weaknesses || []).length > 0 ? (
                          (reportData.report.weaknesses || []).map((item, idx) => (
                            <li key={idx} className="flex gap-2"><span className="mt-0.5">{idx + 1}.</span><span>{item}</span></li>
                          ))
                        ) : (
                          <li>No weaknesses recorded yet.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </section>

                {(reportData.report.chapter_analysis || []).length > 0 && (
                  <section className="px-8 py-7 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900 mb-4">Chapter-by-Chapter Analysis</h2>
                    <div className="space-y-3">
                      {(reportData.report.chapter_analysis || []).map((chapter, idx) => (
                        <div key={idx} className={`p-4 rounded-lg border ${perfColor(chapter.performance)}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <p className="font-semibold">{chapter.chapter}</p>
                            <span className="text-xs uppercase tracking-wide font-bold">{chapter.performance}</span>
                          </div>
                          <p className="text-sm leading-6">{chapter.notes}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {chapterRows.length > 0 && (
                  <section className="px-8 py-7 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900 mb-4">Progress Matrix</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-separate border-spacing-0">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700">
                            <th className="text-left px-4 py-3 rounded-l-lg">Chapter</th>
                            <th className="text-center px-4 py-3">Level 1</th>
                            <th className="text-center px-4 py-3">Level 2</th>
                            <th className="text-center px-4 py-3">Level 3</th>
                            <th className="text-center px-4 py-3 rounded-r-lg">Quiz Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chapterRows.map((row: any, idx: number) => (
                            <tr key={idx} className="border-b border-slate-200 last:border-0">
                              <td className="px-4 py-3 text-slate-900">{row.chapter_title}</td>
                              <td className="text-center px-4 py-3">{row.level1_completed ? 'Done' : 'Pending'}</td>
                              <td className="text-center px-4 py-3">{row.level2_completed ? 'Done' : 'Pending'}</td>
                              <td className="text-center px-4 py-3">{row.level3_completed ? 'Done' : 'Pending'}</td>
                              <td className="text-center px-4 py-3 font-semibold">
                                {row.chapter_quiz_score != null ? `${Math.round(row.chapter_quiz_score)}%` : 'Not graded yet'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {(reportData.report.recommendations || []).length > 0 && (
                  <section className="px-8 py-7 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-indigo-600" /> Recommended Action Plan</h2>
                    <ol className="space-y-3 text-slate-800 list-decimal pl-5">
                      {(reportData.report.recommendations || []).map((recommendation, idx) => (
                        <li key={idx} className="leading-6">{recommendation}</li>
                      ))}
                    </ol>
                  </section>
                )}

                {(reportData.report.learning_style_notes || '').trim() && (
                  <section className="px-8 py-7 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900 mb-3 flex items-center gap-2"><Brain className="w-5 h-5 text-purple-600" /> Learning Style Insight</h2>
                    <p className="text-slate-700 leading-7">{reportData.report.learning_style_notes}</p>
                  </section>
                )}

                {(reportData.report.predicted_areas_of_difficulty || []).length > 0 && (
                  <section className="px-8 py-7 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900 mb-3">Predicted Difficulty Areas</h2>
                    <div className="flex flex-wrap gap-2">
                      {(reportData.report.predicted_areas_of_difficulty || []).map((area, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm border border-slate-200">
                          {area}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <section className="px-8 py-5 bg-slate-50 text-slate-500 text-xs flex flex-wrap items-center justify-between gap-2">
                  <p>Generated by NexaLearn AI Performance Engine</p>
                  <p>Confidential Academic Review Document</p>
                </section>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

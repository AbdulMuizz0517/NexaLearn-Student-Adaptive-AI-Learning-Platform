import { GraduationCap, BookOpen, ArrowLeft, Sparkles } from 'lucide-react';

interface SignupRoleProps {
  onSelectRole: (role: 'student' | 'teacher') => void;
  onLogin: () => void;
}

export default function SignupRole({ onSelectRole, onLogin }: SignupRoleProps) {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/30 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/30 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-pink-500/20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[10%] right-[20%] w-[200px] h-[200px] rounded-full bg-blue-400/20 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Join NexaLearn</h1>
          <p className="text-white/60 mt-2">Choose your role to get started</p>
        </div>

        {/* Glass Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="space-y-4">
            <button
              onClick={() => onSelectRole('student')}
              className="w-full group p-5 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-xl font-semibold text-white block">I am a Student</span>
                  <span className="text-sm text-white/50">Start learning with AI-powered paths</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => onSelectRole('teacher')}
              className="w-full group p-5 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-xl font-semibold text-white block">I am a Teacher</span>
                  <span className="text-sm text-white/50">Manage courses and track students</span>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </div>
        </div>

        <p className="text-center text-white/60 mt-6">
          Already have an account?{' '}
          <button onClick={onLogin} className="text-indigo-300 hover:text-white font-medium transition-colors">
            Login
          </button>
        </p>

        <p className="text-center text-white/30 text-xs mt-4">
          Powered by AI-driven adaptive learning
        </p>
      </div>
    </div>
  );
}

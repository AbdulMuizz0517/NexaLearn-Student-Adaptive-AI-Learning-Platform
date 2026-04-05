import { Sparkles } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="h-screen flex flex-col items-center justify-between bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-8">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="mb-6 relative">
          <Sparkles className="w-24 h-24 animate-pulse" />
          <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
        </div>
        <h1 className="text-5xl mb-4 tracking-tight">NexaLearn</h1>
        <p className="text-xl text-indigo-100">AI-Powered Learning Made Simple.</p>
      </div>
      
      <div className="mb-12">
        <p className="text-indigo-200 animate-pulse">Loading…</p>
      </div>
    </div>
  );
}

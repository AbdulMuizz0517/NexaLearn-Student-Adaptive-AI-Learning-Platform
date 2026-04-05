import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { LogIn, Brain, Sparkles, TrendingUp, Eye, EyeOff, X, Mail } from "lucide-react";

interface LoginScreenProps {
  onLogin: (role: "student" | "admin") => void;
  onSignup: () => void;
}

export default function LoginScreen({ onLogin, onSignup }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showLoginError, setShowLoginError] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setShowLoginError(false);
    setLoginErrorMessage("");
    try {
      const response = await axiosClient.post("/auth/login", {
        email: email.trim(),
        password,
      });

      // Handle Remember Me
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email.trim());
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      login(response.data.access_token, {
        id: response.data.user_id,
        role: response.data.role,
        full_name: response.data.full_name,
        email: response.data.email,
      });
      onLogin(response.data.role);
      navigate(response.data.role === "admin" ? "/admin-dashboard" : "/student-dashboard");
    } catch (error: any) {
      setLoginErrorMessage(error?.response?.data?.detail ?? "Unable to login");
      setShowLoginError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: "linear-gradient(135deg, #f0f0fb 0%, #e8ebf5 100%)",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* ───── Left: Form ───── */}
      <div className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="w-full" style={{ maxWidth: 540 }}>
          {/* Logo */}
          <div className="flex justify-center relative z-10">
            <img
              src="/NEXALEARN.png"
              alt="NexaLearn Logo"
              style={{ 
                height: "220px",
                width: "auto",
                objectFit: "contain",
                marginTop: "-40px",
                marginBottom: "-40px",
                filter: "drop-shadow(0 2px 8px rgba(99,102,241,0.18))" 
              }}
            />
          </div>

          <div className="text-center w-full">
            {/* Heading */}
            <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-3">
              Welcome back
            </h1>
            <p className="text-gray-500 font-medium text-base mb-6">
              Sign in to continue your learning journey
            </p>
          </div>

          {/* ── Form Card ── */}
          <div
            style={{
              background: "rgba(237, 233, 254, 0.35)",
              border: "1px solid rgba(196, 181, 253, 0.4)",
              borderRadius: 24,
              padding: "40px 36px",
              boxShadow: "0 8px 32px rgba(99, 102, 241, 0.10), 0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <form onSubmit={handleLogin}>
              {/* Email */}
              <div className="mb-7 w-full">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 px-4 rounded-xl bg-white text-gray-900 text-sm outline-none transition-all duration-200 placeholder:text-gray-300 focus:ring-2 focus:ring-indigo-400/25 block"
                  style={{
                    width: "100%",
                    border: `1.5px solid ${errors.email ? "#ef4444" : "#d4d0f7"}`,
                  }}
                  onFocus={(e) => {
                    if (!errors.email) e.currentTarget.style.borderColor = "#6366f1";
                  }}
                  onBlur={(e) => {
                    if (!errors.email) e.currentTarget.style.borderColor = "#d4d0f7";
                  }}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="mb-5 w-full">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Password
                </label>
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 px-4 pr-12 rounded-xl bg-white text-gray-900 text-sm outline-none transition-all duration-200 placeholder:text-gray-300 focus:ring-2 focus:ring-indigo-400/25 block"
                    style={{
                      width: "100%",
                      border: `1.5px solid ${errors.password ? "#ef4444" : "#d4d0f7"}`,
                    }}
                    onFocus={(e) => {
                      if (!errors.password)
                        e.currentTarget.style.borderColor = "#6366f1";
                    }}
                    onBlur={(e) => {
                      if (!errors.password)
                        e.currentTarget.style.borderColor = "#d4d0f7";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-indigo-600 transition-colors"
                    style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", zIndex: 10 }}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-[18px] h-[18px]" />
                    ) : (
                      <Eye className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember me + Forgot Password */}
              <div className="flex items-center justify-between mb-8 w-full">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                    style={{ zIndex: 20 }}
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-sm font-medium cursor-pointer" 
                    style={{ color: "#4f46e5" }}
                  >
                    Remember me
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm font-bold underline transition-colors"
                  style={{ color: "#4f46e5", zIndex: 20 }}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Sign In – centered, full width */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.97]"
                style={{
                  background:
                    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)",
                }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sign up link */}
          <p className="mt-10 text-sm text-gray-400 text-center">
            Don't have an account?{" "}
            <button
              onClick={onSignup}
              className="text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>

      {/* ───── Right: Illustration Panel ───── */}
      <div
        className="hidden lg:flex w-[480px] relative items-center justify-center overflow-hidden m-4 rounded-3xl"
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 40%, #a78bfa 70%, #c4b5fd 100%)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="absolute top-1/3 -right-8 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
          <div className="absolute bottom-1/3 left-4 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-10">
          {/* Main icon cluster */}
          <div className="relative mb-10">
            <div
              className="w-36 h-36 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <img
                  src="/NEXALEARN.png"
                  alt="NexaLearn"
                  className="w-20 h-20 object-contain"
                  style={{ filter: "brightness(0) invert(1) drop-shadow(0 2px 8px rgba(0,0,0,0.2))" }}
                />
              </div>
            </div>

            {/* Orbiting icons */}
            <div
              className="absolute -top-3 -right-3 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)", animation: "float 3s ease-in-out infinite" }}
            >
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div
              className="absolute -bottom-2 -left-4 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)", animation: "float 3.5s ease-in-out infinite 0.5s" }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div
              className="absolute top-1/2 -right-10 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", animation: "float 4s ease-in-out infinite 1s" }}
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Text */}
          <h2 className="text-white text-2xl font-bold mb-3">
            Learn Smarter,<br />Not Harder
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-[260px]">
            AI-powered adaptive learning that understands your pace and personalizes every step of your journey
          </p>

          {/* Feature tags */}
          <div className="flex flex-wrap gap-2 mt-8 justify-center">
            {["Adaptive AI", "Smart Quizzes", "Track Progress"].map((tag) => (
              <span
                key={tag}
                className="px-4 py-2 rounded-full text-white/90 text-xs font-medium"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Float animation */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>

      {/* ───── Forgot Password Modal ───── */}
      {showForgotPassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowForgotPassword(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "fadeInUp 0.25s ease-out" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
              <Mail className="w-8 h-8 text-indigo-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-700 font-medium">
                  Need to reset your password?
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Please contact your administrator to reset your password securely.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowForgotPassword(false)}
              className="w-full h-12 rounded-xl text-white font-semibold text-base transition-all duration-300 hover:shadow-lg active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              }}
            >
              Got it
            </button>
          </div>

          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(16px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* ───── Login Error Modal (Custom UI) ───── */}
      {showLoginError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowLoginError(false)}
        >
          <div
            className="bg-white rounded-2xl p-7 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Sign-in Failed</h2>
              <button
                onClick={() => setShowLoginError(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-700 mb-5">{loginErrorMessage}</p>
            <button
              onClick={() => setShowLoginError(false)}
              className="w-full h-10 rounded-xl text-white font-semibold text-sm"
              style={{ background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)" }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
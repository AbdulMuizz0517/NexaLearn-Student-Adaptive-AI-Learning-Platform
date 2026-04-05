import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { Eye, EyeOff, BookOpen, Brain, Sparkles, Users } from "lucide-react";

interface SignupStudentProps {
  onSignup: () => void;
  onLogin: () => void;
  onBack?: () => void;
}

export default function SignupStudent({ onSignup, onLogin, onBack }: SignupStudentProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.name = "Full name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    else if (password.length < 6) errs.password = "Min 6 characters";
    else if (!/[A-Z]/.test(password)) errs.password = "Must include an uppercase letter";
    else if (!/[0-9]/.test(password)) errs.password = "Must include a number";
    else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errs.password = "Must include a symbol (!@#$%...)";
    if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    if (!agreed) errs.terms = "You must agree to terms";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await axiosClient.post("/auth/register", {
        full_name: fullName,
        email,
        password,
      });
      login(response.data.access_token, {
        id: response.data.user_id,
        role: response.data.role,
        full_name: response.data.full_name,
        email: response.data.email,
      });
      onSignup();
      navigate("/student-dashboard");
    } catch (error: any) {
      let message = "Failed to create account";
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        message = typeof detail === "string" ? detail : JSON.stringify(detail);
      }
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field?: string) =>
    `w-full h-12 px-4 rounded-xl border-2 bg-white text-gray-900 text-sm outline-none transition-all duration-200 placeholder:text-gray-300 ${
      field && errors[field] ? "border-red-400" : "border-gray-200 focus:border-indigo-500"
    }`;

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%)" }}>
      {/* ───── Left: Illustration Panel ───── */}
      <div
        className="hidden lg:flex w-[480px] relative items-center justify-center overflow-hidden m-4 rounded-3xl"
        style={{
          background: "linear-gradient(135deg, #10b981 0%, #14b8a6 40%, #06b6d4 100%)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="absolute top-1/3 left-4 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-10">
          <div className="relative mb-10">
            <div
              className="w-36 h-36 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                <img src="/NEXALEARN.png" alt="NexaLearn" className="w-16 h-16 object-contain" style={{ filter: "brightness(0) invert(1) drop-shadow(0 2px 8px rgba(0,0,0,0.2))" }} />
              </div>
            </div>
            <div
              className="absolute -top-3 -left-3 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)", animation: "float 3s ease-in-out infinite" }}
            >
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div
              className="absolute -bottom-2 -right-4 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)", animation: "float 3.5s ease-in-out infinite 0.5s" }}
            >
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div
              className="absolute top-1/2 -left-10 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", animation: "float 4s ease-in-out infinite 1s" }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>

          <h2 className="text-white text-2xl font-bold mb-3">Start Your Journey</h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-[260px]">
            Join thousands of learners mastering new skills with AI-powered personalization
          </p>

          <div className="flex flex-wrap gap-2 mt-8 justify-center">
            {["Personalized", "Track Progress", "Free to Start"].map((tag) => (
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

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>

      {/* ───── Right: Form ───── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full" style={{ maxWidth: 420 }}>
          {/* Logo */}
          <div className="flex justify-center relative z-10 w-full mb-4">
            <img
              src="/NEXALEARN.png"
              alt="NexaLearn Logo"
              style={{ 
                height: "84px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 2px 8px rgba(99,102,241,0.18))" 
              }}
            />
          </div>

          <div className="text-center w-full">
            <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-1">Create Account</h1>
            <p className="text-gray-500 font-medium mb-6 text-sm">Sign up to start your learning journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
              <input
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass("name")}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass("email")}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass("password")} pr-11`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-300 hover:text-gray-500 transition-colors" style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", zIndex: 10 }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${inputClass("confirmPassword")} pr-11`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-gray-300 hover:text-gray-500 transition-colors" style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", zIndex: 10 }}>
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword}</p>}
            </div>

            <label htmlFor="signup-terms" className="flex items-center gap-2 cursor-pointer select-none group pt-1">
              <input
                id="signup-terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">I agree to terms & conditions</span>
            </label>
            {errors.terms && <p className="text-red-500 text-xs font-medium">{errors.terms}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98] mt-2"
              style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)" }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                <>Create Account</>
              )}
            </button>
          </form>

          <p className="mt-8 text-sm text-gray-400 text-center">
            Already have an account?{" "}
            <button onClick={onLogin} className="text-indigo-500 hover:text-indigo-700 font-semibold transition-colors">
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
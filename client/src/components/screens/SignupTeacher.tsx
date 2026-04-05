import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { UserPlus, Eye, EyeOff, ArrowLeft } from "lucide-react";

interface SignupTeacherProps {
  onSignup: () => void;
  onLogin: () => void;
  onBack?: () => void;
}

export default function SignupTeacher({ onSignup, onLogin, onBack }: SignupTeacherProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [institution, setInstitution] = useState("");
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
        role: "teacher",
        institution: institution || undefined,
      });
      login(response.data.access_token, {
        id: response.data.user_id,
        role: response.data.role,
        full_name: response.data.full_name,
        email: response.data.email,
      });
      onSignup();
      navigate("/teacher-dashboard");
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
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img
              src="/NEXALEARN.png"
              alt="NexaLearn Logo"
              style={{
                height: "84px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 2px 8px rgba(255,255,255,0.2))"
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Teacher Registration</h1>
          <p className="text-white/60 mt-1">Join NexaLearn as an educator</p>
        </div>

        {/* Glass Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
          {onBack && (
            <button onClick={onBack} className="inline-flex items-center gap-1 text-white/50 hover:text-white/80 transition-colors text-sm mb-4">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-white/90 font-medium text-sm">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/20 h-11 rounded-xl backdrop-blur-sm"
              />
              {errors.name && <p className="text-red-300 text-xs">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-white/90 font-medium text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/20 h-11 rounded-xl backdrop-blur-sm"
              />
              {errors.email && <p className="text-red-300 text-xs">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="institution" className="text-white/90 font-medium text-sm">Institution / School <span className="text-white/40">(Optional)</span></Label>
              <Input
                id="institution"
                placeholder="Your institution name"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/20 h-11 rounded-xl backdrop-blur-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/90 font-medium text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/20 h-11 rounded-xl backdrop-blur-sm pr-12"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-300 text-xs">{errors.password}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-white/90 font-medium text-sm">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/20 h-11 rounded-xl backdrop-blur-sm pr-12"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-300 text-xs">{errors.confirmPassword}</p>}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 rounded border-white/30 bg-white/10 text-indigo-500 focus:ring-indigo-400"
              />
              <label htmlFor="terms" className="text-white/60 text-sm cursor-pointer">
                I agree to terms & conditions
              </label>
            </div>
            {errors.terms && <p className="text-red-300 text-xs">{errors.terms}</p>}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                className="px-8 h-11 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-[1.02]"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Create Account
                  </div>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-5 text-center">
            <p className="text-white/60 text-sm">
              Already have an account?{' '}
              <button onClick={onLogin} className="text-purple-300 hover:text-white font-medium transition-colors">Login</button>
            </p>
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Powered by AI-driven adaptive learning
        </p>
      </div>
    </div>
  );
}

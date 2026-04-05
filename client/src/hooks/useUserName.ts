import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function useUserName(): string {
  const { user } = useAuth();
  return user?.full_name || user?.email?.split('@')[0] || 'User';
}

export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return () => {
    logout();
    navigate('/');
    window.location.reload();
  };
}

// Combined hook for screens that need both
export function useNavBarProps(userRole: 'student' | 'teacher' | 'admin' | null) {
  const userName = useUserName();
  const handleLogout = useLogout();
  
  return {
    userName,
    userRole,
    onLogout: handleLogout
  };
}

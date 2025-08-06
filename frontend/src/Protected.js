import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useUserStore from "./store/useUserStore";
import { checkUserAuth } from "./services/user.service";
import Loader from "./utils/Loader";

export const ProtectedRoute = () => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const { isAuthenticated, setUser, clearUser } = useUserStore();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await checkUserAuth();
        if (res.isAuthenticated) {
          setUser(res.user);
        } else {
          clearUser();
        }
      } catch (error) {
        clearUser();
      } finally {
        setIsChecking(false);
      }
    };
    verifyAuth();
  }, [setUser, clearUser]);

  if (isChecking) {
    return <Loader></Loader>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/user-login" state={{ from: location }} replace />;
  }
  return <Outlet />;
};

export const PublicRoute = () => {
  const location = useLocation();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return <Outlet />;
};

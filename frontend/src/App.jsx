import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/user-login/Login";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ProtectedRoute, PublicRoute } from "./Protected";
import HomePage from "./components/HomePage";
import UserDetail from "./components/UserDetail";
import Status from "./pages/StatusSection/Status";
import Setting from "./pages/SettingSection/Setting";
function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Router>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/user-login" element={<Login />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/user-profile" element={<UserDetail />} />
            <Route path="/status" element={<Status />} />
            <Route path="/setting" element={<Setting />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;

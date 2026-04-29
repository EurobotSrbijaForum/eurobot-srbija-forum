import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NewThread from "@/pages/NewThread";
import Thread from "@/pages/Thread";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import Search from "@/pages/Search";
import AuthCallback from "@/pages/AuthCallback";
import { Toaster } from "sonner";
import { Navigate } from "react-router-dom";

function ProfileRedirect() {
  // /profile -> /profile/:my_user_id, fallback to /login
  const stored = typeof window !== "undefined" ? document.cookie.includes("session_token") : false;
  return <Navigate to={stored ? "/" : "/login"} replace />;
}

function CategoryRoute() {
  const { pathname } = useLocation();
  const slug = pathname.split("/").pop();
  return <Home category={slug} />;
}

function AppRouter() {
  const location = useLocation();
  // Catch oauth callback regardless of current route
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/new" element={<NewThread />} />
        <Route path="/thread/:id" element={<Thread />} />
        <Route path="/c/:slug" element={<CategoryRoute />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/profile" element={<ProfileRedirect />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/search" element={<Search />} />
      </Routes>
      <footer className="mt-16 border-t-[3px] border-[#09090B] py-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm font-bold uppercase tracking-widest" data-testid="footer">
          BOLT/FORUM · BUILT LOUD · {new Date().getFullYear()}
        </div>
      </footer>
    </>
  );
}

function App() {
  return (
    <div className="App min-h-screen">
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster position="top-right" toastOptions={{
            style: { border: "3px solid #09090B", boxShadow: "4px 4px 0 0 #09090B", borderRadius: 0, fontFamily: "Space Grotesk", fontWeight: 700 }
          }} />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;

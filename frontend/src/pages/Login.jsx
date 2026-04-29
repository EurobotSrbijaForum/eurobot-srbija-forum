import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatErr } from "@/lib/api";
import { GoogleLogo, Lightning } from "@phosphor-icons/react";

const startGoogleLogin = () => {
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const redirectUrl = window.location.origin + "/";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
};

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await login(email, password);
      toast.success("Welcome back");
      nav("/");
    } catch (ex) {
      setErr(formatErr(ex.response?.data?.detail) || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10" data-testid="login-page">
      <div className="brutal-card p-8 bg-white">
        <div className="flex items-center gap-2 mb-6">
          <Lightning weight="fill" size={32} color="#FF4500" />
          <h1 className="font-display text-3xl">LOG IN</h1>
        </div>

        <button onClick={startGoogleLogin} className="brutal-btn brutal-btn--ghost w-full mb-4" data-testid="google-login-btn">
          <GoogleLogo weight="bold" size={18} /> Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 border-t-2 border-[#09090B]"></div>
          <span className="text-xs font-bold uppercase">or with email</span>
          <div className="flex-1 border-t-2 border-[#09090B]"></div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input data-testid="email-input" type="email" required placeholder="email@you.com" value={email} onChange={(e) => setEmail(e.target.value)} className="brutal-input" />
          <input data-testid="password-input" type="password" required placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} className="brutal-input" />
          {err && <div className="bg-[#FF4500] text-white p-3 border-[3px] border-[#09090B] font-bold text-sm" data-testid="login-error">{err}</div>}
          <button data-testid="login-submit" disabled={busy} className="brutal-btn w-full">{busy ? "SIGNING IN…" : "SIGN IN"}</button>
        </form>

        <p className="mt-5 text-sm">
          New here? <Link to="/register" className="font-bold underline text-[#FF4500]" data-testid="goto-register">Create an account</Link>
        </p>
        <div className="mt-3 text-xs font-mono p-2 bg-[#FFF6CC] border-2 border-[#09090B]" data-testid="demo-creds">
          Demo: demo@forum.com / demo123 · Admin: admin@forum.com / admin123
        </div>
      </div>
    </div>
  );
}

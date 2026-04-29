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

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await register(email, password, name);
      toast.success("Welcome to the forum!");
      nav("/");
    } catch (ex) {
      setErr(formatErr(ex.response?.data?.detail) || "Sign up failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10" data-testid="register-page">
      <div className="brutal-card p-8 bg-white">
        <div className="flex items-center gap-2 mb-6">
          <Lightning weight="fill" size={32} color="#FF007F" />
          <h1 className="font-display text-3xl">SIGN UP</h1>
        </div>

        <button onClick={startGoogleLogin} className="brutal-btn brutal-btn--ghost w-full mb-4" data-testid="google-register-btn">
          <GoogleLogo weight="bold" size={18} /> Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 border-t-2 border-[#09090B]"></div>
          <span className="text-xs font-bold uppercase">or with email</span>
          <div className="flex-1 border-t-2 border-[#09090B]"></div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input data-testid="name-input" required placeholder="display name" value={name} onChange={(e) => setName(e.target.value)} className="brutal-input" />
          <input data-testid="email-input" type="email" required placeholder="email@you.com" value={email} onChange={(e) => setEmail(e.target.value)} className="brutal-input" />
          <input data-testid="password-input" type="password" required minLength={6} placeholder="password (min 6)" value={password} onChange={(e) => setPassword(e.target.value)} className="brutal-input" />
          {err && <div className="bg-[#FF4500] text-white p-3 border-[3px] border-[#09090B] font-bold text-sm" data-testid="register-error">{err}</div>}
          <button data-testid="register-submit" disabled={busy} className="brutal-btn brutal-btn--pink w-full">{busy ? "CREATING…" : "CREATE ACCOUNT"}</button>
        </form>

        <p className="mt-5 text-sm">
          Already have one? <Link to="/login" className="font-bold underline text-[#FF007F]" data-testid="goto-login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

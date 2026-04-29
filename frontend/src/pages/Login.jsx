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
      toast.success("Dobrodošao nazad");
      nav("/");
    } catch (ex) {
      setErr(formatErr(ex.response?.data?.detail) || "Greška pri prijavi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10" data-testid="login-page">
      <div className="brutal-card p-8 bg-white">
        <div className="flex items-center gap-2 mb-6">
          <Lightning weight="fill" size={32} color="#9B2C2C" />
          <h1 className="font-display text-3xl">PRIJAVA</h1>
        </div>

        <button onClick={startGoogleLogin} className="brutal-btn brutal-btn--ghost w-full mb-4" data-testid="google-login-btn">
          <GoogleLogo weight="bold" size={18} /> Nastavi sa Google-om
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 border-t-2 border-[#09090B]"></div>
          <span className="text-xs font-bold uppercase">ili putem email-a</span>
          <div className="flex-1 border-t-2 border-[#09090B]"></div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input data-testid="email-input" type="email" required placeholder="email@primer.com" value={email} onChange={(e) => setEmail(e.target.value)} className="brutal-input" />
          <input data-testid="password-input" type="password" required placeholder="lozinka" value={password} onChange={(e) => setPassword(e.target.value)} className="brutal-input" />
          {err && <div className="bg-[#9B2C2C] text-white p-3 border-[3px] border-[#09090B] font-bold text-sm" data-testid="login-error">{err}</div>}
          <button data-testid="login-submit" disabled={busy} className="brutal-btn w-full">{busy ? "PRIJAVLJIVANJE…" : "PRIJAVI SE"}</button>
        </form>

        <p className="mt-5 text-sm">
          Nemaš nalog? <Link to="/register" className="font-bold underline text-[#9B2C2C]" data-testid="goto-register">Registruj se</Link>
        </p>
        <div className="mt-3 text-xs font-mono p-2 bg-[#EFE4D2] border-2 border-[#09090B]" data-testid="demo-creds">
          Demo: demo@forum.com / demo123 · Admin: admin@forum.com / admin123
        </div>
      </div>
    </div>
  );
}

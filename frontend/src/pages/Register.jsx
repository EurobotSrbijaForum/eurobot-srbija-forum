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
      toast.success("Dobrodošao na forum!");
      nav("/");
    } catch (ex) {
      setErr(formatErr(ex.response?.data?.detail) || "Greška pri registraciji");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10" data-testid="register-page">
      <div className="brutal-card p-8 bg-white">
        <div className="flex items-center gap-2 mb-6">
          <Lightning weight="fill" size={32} color="#A23B47" />
          <h1 className="font-display text-3xl">REGISTRACIJA</h1>
        </div>

        <button onClick={startGoogleLogin} className="brutal-btn brutal-btn--ghost w-full mb-4" data-testid="google-register-btn">
          <GoogleLogo weight="bold" size={18} /> Nastavi sa Google-om
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 border-t-2 border-[#09090B]"></div>
          <span className="text-xs font-bold uppercase">ili putem email-a</span>
          <div className="flex-1 border-t-2 border-[#09090B]"></div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input data-testid="name-input" required placeholder="korisničko ime" value={name} onChange={(e) => setName(e.target.value)} className="brutal-input" />
          <input data-testid="email-input" type="email" required placeholder="email@primer.com" value={email} onChange={(e) => setEmail(e.target.value)} className="brutal-input" />
          <input data-testid="password-input" type="password" required minLength={6} placeholder="lozinka (min 6 karaktera)" value={password} onChange={(e) => setPassword(e.target.value)} className="brutal-input" />
          {err && <div className="bg-[#9B2C2C] text-white p-3 border-[3px] border-[#09090B] font-bold text-sm" data-testid="register-error">{err}</div>}
          <button data-testid="register-submit" disabled={busy} className="brutal-btn brutal-btn--pink w-full">{busy ? "KREIRANJE…" : "KREIRAJ NALOG"}</button>
        </form>

        <p className="mt-5 text-sm">
          Već imaš nalog? <Link to="/login" className="font-bold underline text-[#A23B47]" data-testid="goto-login">Prijavi se</Link>
        </p>
      </div>
    </div>
  );
}

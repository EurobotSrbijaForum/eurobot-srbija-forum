import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) { navigate("/login"); return; }
    const session_id = m[1];

    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id });
        setUser(data);
        // clear hash and go home
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/", { replace: true });
      } catch (e) {
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center" data-testid="auth-callback">
      <div className="brutal-card p-8 bg-[#EFE4D2]">
        <p className="font-display text-2xl">SIGNING YOU IN…</p>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { MagnifyingGlass, Plus, SignOut, User, ShieldStar, House } from "@phosphor-icons/react";
import { API } from "@/lib/api";

const SerbianFlag = ({ size = 56 }) => (
  <svg viewBox="0 0 30 30" width={size} height={size * 2 / 3} aria-label="Serbian flag" className="block">
    <rect x="0" y="0"  width="30" height="10" fill="#C6363C" />
    <rect x="0" y="10" width="30" height="10" fill="#1E3A5F" />
    <rect x="0" y="20" width="30" height="10" fill="#FFFFFF" />
  </svg>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const submitSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const avatar = user?.avatar_url
    ? (user.avatar_url.startsWith("http") ? user.avatar_url : `${API.replace("/api","")}${user.avatar_url}`)
    : null;

  return (
    <header className="sticky top-0 z-40 bg-[#F4F1EA] border-b-[3px] border-[#09090B]" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-3 group" data-testid="logo-link">
          <div className="border-[3px] border-[#09090B] overflow-hidden group-hover:-translate-y-0.5 transition-transform">
            <SerbianFlag size={56} />
          </div>
          <span className="font-display text-xl sm:text-2xl tracking-tight hidden sm:block leading-tight">EUROBOT<br/>SRBIJA</span>
        </Link>

        <form onSubmit={submitSearch} className="flex-1 max-w-md" data-testid="search-form">
          <div className="relative">
            <MagnifyingGlass weight="bold" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1A1A1F] pointer-events-none z-10" />
            <input
              data-testid="search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pretraži teme, tagove…"
              style={{ paddingLeft: "3rem" }}
              className="brutal-input py-2 text-sm"
            />
          </div>
        </form>

        <div className="flex items-center gap-3 ml-auto">
          <Link to="/" className="hidden md:inline-flex brutal-btn brutal-btn--ghost" data-testid="nav-home">
            <House weight="bold" size={16} /> Početna
          </Link>

        {user ? (
          <>
            <Link to="/new" className="brutal-btn brutal-btn--yellow" data-testid="nav-new-thread">
              <Plus weight="bold" size={16} /> <span className="hidden sm:inline">Objavi</span>
            </Link>
            <div className="relative">
              <button
                data-testid="user-menu-trigger"
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-11 h-11 border-[3px] border-[#09090B] brutal-shadow bg-[#A23B47] hover:-translate-y-0.5 transition-transform overflow-hidden"
              >
                {avatar ? (
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display text-white text-lg">{user.name?.[0]?.toUpperCase() || "U"}</span>
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border-[3px] border-[#09090B] brutal-shadow-md py-2" data-testid="user-menu">
                  <div className="px-4 py-2 border-b-2 border-[#09090B]">
                    <div className="font-bold truncate">{user.name}</div>
                    <div className="text-xs text-zinc-500 truncate">{user.email}</div>
                  </div>
                  <Link onClick={() => setMenuOpen(false)} to={`/profile/${user.user_id}`} className="block px-4 py-2 hover:bg-[#EFE4D2] font-semibold flex items-center gap-2" data-testid="menu-profile">
                    <User weight="bold" size={16} /> Moj profil
                  </Link>
                  {user.role === "admin" && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin" className="block px-4 py-2 hover:bg-[#EFE4D2] font-semibold flex items-center gap-2" data-testid="menu-admin">
                      <ShieldStar weight="bold" size={16} /> Admin
                    </Link>
                  )}
                  <button
                    data-testid="menu-logout"
                    onClick={async () => { setMenuOpen(false); await logout(); navigate("/"); }}
                    className="w-full text-left px-4 py-2 hover:bg-[#9B2C2C] hover:text-white font-semibold flex items-center gap-2"
                  >
                    <SignOut weight="bold" size={16} /> Odjavi se
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="brutal-btn brutal-btn--ghost" data-testid="nav-login">Prijava</Link>
            <Link to="/register" className="brutal-btn" data-testid="nav-register">Registracija</Link>
          </>
        )}
        </div>
      </div>
    </header>
  );
}

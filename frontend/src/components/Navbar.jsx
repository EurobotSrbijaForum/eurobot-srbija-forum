import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { MagnifyingGlass, Plus, SignOut, User, ShieldStar, House, X } from "@phosphor-icons/react";
import { API } from "@/lib/api";

const SerbianFlag = ({ size = 56 }) => (
  <svg viewBox="0 0 30 30" width={size} height={size * 2 / 3} aria-label="Serbian flag" className="block">
    <rect x="-10" y="0"  width="50" height="10" fill="#C6363C" />
    <rect x="-10" y="10" width="50" height="10" fill="#1E3A5F" />
    <rect x="-10" y="20" width="50" height="10" fill="#FFFFFF" />
  </svg>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  const submitSearch = (e) => {
    e.preventDefault();
    if (q.trim()) { navigate(`/search?q=${encodeURIComponent(q.trim())}`); setSearchOpen(false); }
  };

  const avatar = user?.avatar_url
    ? (user.avatar_url.startsWith("http") ? user.avatar_url : `${API.replace("/api","")}${user.avatar_url}`)
    : null;

  return (
    <header className="sticky top-0 z-40 bg-[#F4F1EA] border-b-[3px] border-[#09090B]" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-4">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0" data-testid="logo-link">
          <div className="border-[3px] border-[#09090B] overflow-hidden group-hover:-translate-y-0.5 transition-transform">
            <span className="hidden sm:block"><SerbianFlag size={56} /></span>
            <span className="sm:hidden"><SerbianFlag size={42} /></span>
          </div>
          <span className="font-display text-base sm:text-2xl tracking-tight hidden sm:block leading-tight">EUROBOT<br/>FORUM</span>
        </Link>

        {/* Desktop search */}
        <form onSubmit={submitSearch} className="hidden sm:block flex-1 max-w-md" data-testid="search-form">
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

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden w-10 h-10 border-[3px] border-[#09090B] bg-white flex items-center justify-center brutal-shadow active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            aria-label="Pretraži"
            data-testid="mobile-search-toggle"
          >
            <MagnifyingGlass weight="bold" size={18} />
          </button>

          <Link to="/" className="inline-flex items-center gap-1 brutal-btn brutal-btn--ghost !px-3 lg:!px-5" data-testid="nav-home">
            <House weight="bold" size={16} /> <span className="hidden lg:inline">Početna</span>
          </Link>

          {user ? (
            <>
              <Link to="/new" className="brutal-btn brutal-btn--yellow !px-3 sm:!px-5" data-testid="nav-new-thread">
                <Plus weight="bold" size={16} /> <span className="hidden sm:inline">Objavi</span>
              </Link>
              <div className="relative">
                <button
                  data-testid="user-menu-trigger"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-10 h-10 sm:w-11 sm:h-11 border-[3px] border-[#09090B] brutal-shadow bg-[#A23B47] hover:-translate-y-0.5 transition-transform overflow-hidden flex-shrink-0"
                >
                  {avatar ? (
                    <img src={avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-display text-white text-lg">{user.name?.[0]?.toUpperCase() || "U"}</span>
                  )}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border-[3px] border-[#09090B] brutal-shadow-md py-2 z-50" data-testid="user-menu">
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
              <Link to="/login" className="brutal-btn brutal-btn--ghost !px-3 sm:!px-5" data-testid="nav-login">Prijava</Link>
              <Link to="/register" className="brutal-btn !px-3 sm:!px-5" data-testid="nav-register"><span className="hidden sm:inline">Registracija</span><span className="sm:hidden">Reg.</span></Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="sm:hidden border-t-[3px] border-[#09090B] bg-[#F4F1EA] p-3" data-testid="mobile-search-bar">
          <form onSubmit={submitSearch} className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass weight="bold" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A1F] pointer-events-none z-10" />
              <input
                data-testid="search-input-mobile"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pretraži…"
                style={{ paddingLeft: "2.5rem" }}
                className="brutal-input py-2 text-sm"
                autoFocus
              />
            </div>
            <button type="button" onClick={() => setSearchOpen(false)} className="w-10 h-10 border-[3px] border-[#09090B] bg-white flex items-center justify-center" aria-label="Zatvori"><X weight="bold" size={18} /></button>
          </form>
        </div>
      )}
    </header>
  );
}

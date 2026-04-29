import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { MagnifyingGlass, Plus, SignOut, User, Lightning, ShieldStar, House } from "@phosphor-icons/react";
import { API } from "@/lib/api";

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
    <header className="sticky top-0 z-40 bg-[#FFF8F0] border-b-[3px] border-[#09090B]" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
          <div className="w-10 h-10 bg-[#FF4500] border-[3px] border-[#09090B] flex items-center justify-center brutal-shadow group-hover:rotate-6 transition-transform">
            <Lightning weight="fill" size={22} color="#FFF8F0" />
          </div>
          <span className="font-display text-2xl tracking-tight hidden sm:block">BOLT/FORUM</span>
        </Link>

        <form onSubmit={submitSearch} className="flex-1 max-w-md" data-testid="search-form">
          <div className="relative">
            <MagnifyingGlass weight="bold" size={18} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              data-testid="search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search threads, tags…"
              className="brutal-input pl-10 py-2 text-sm"
            />
          </div>
        </form>

        <Link to="/" className="hidden md:inline-flex brutal-btn brutal-btn--ghost" data-testid="nav-home">
          <House weight="bold" size={16} /> Home
        </Link>

        {user ? (
          <>
            <Link to="/new" className="brutal-btn brutal-btn--yellow" data-testid="nav-new-thread">
              <Plus weight="bold" size={16} /> <span className="hidden sm:inline">Post</span>
            </Link>
            <div className="relative">
              <button
                data-testid="user-menu-trigger"
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-11 h-11 border-[3px] border-[#09090B] brutal-shadow bg-[#FF007F] hover:-translate-y-0.5 transition-transform overflow-hidden"
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
                  <Link onClick={() => setMenuOpen(false)} to={`/profile/${user.user_id}`} className="block px-4 py-2 hover:bg-[#FFD700] font-semibold flex items-center gap-2" data-testid="menu-profile">
                    <User weight="bold" size={16} /> My Profile
                  </Link>
                  {user.role === "admin" && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin" className="block px-4 py-2 hover:bg-[#FFD700] font-semibold flex items-center gap-2" data-testid="menu-admin">
                      <ShieldStar weight="bold" size={16} /> Admin
                    </Link>
                  )}
                  <button
                    data-testid="menu-logout"
                    onClick={async () => { setMenuOpen(false); await logout(); navigate("/"); }}
                    className="w-full text-left px-4 py-2 hover:bg-[#FF4500] hover:text-white font-semibold flex items-center gap-2"
                  >
                    <SignOut weight="bold" size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="brutal-btn brutal-btn--ghost" data-testid="nav-login">Log In</Link>
            <Link to="/register" className="brutal-btn" data-testid="nav-register">Sign Up</Link>
          </>
        )}
      </div>
    </header>
  );
}

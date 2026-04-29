import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { ShieldStar, PushPin, Lock, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Admin() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [threads, setThreads] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (user === null) return; // still loading
    if (!user || user.role !== "admin") nav("/");
  }, [user, nav]);

  const load = async () => {
    const [tRes, sRes] = await Promise.all([api.get("/threads", { params: { sort: "new", limit: 100 } }), api.get("/stats")]);
    setThreads(tRes.data); setStats(sRes.data);
  };
  useEffect(() => { load(); }, []);

  const togglePin = async (id) => { try { await api.post(`/threads/${id}/pin`); load(); } catch { toast.error("Failed"); } };
  const toggleLock = async (id) => { try { await api.post(`/threads/${id}/lock`); load(); } catch { toast.error("Failed"); } };
  const del = async (id) => { if (!window.confirm("Delete?")) return; try { await api.delete(`/threads/${id}`); load(); } catch { toast.error("Failed"); } };

  if (!user || user.role !== "admin") return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" data-testid="admin-page">
      <div className="brutal-card p-6 bg-[#09090B] text-white mb-6 flex items-center gap-3">
        <ShieldStar weight="fill" size={32} color="#FFD700" />
        <h1 className="font-display text-3xl">ADMIN PANEL</h1>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="brutal-card p-5 bg-[#FF4500] text-white"><div className="font-mono text-xs uppercase">Threads</div><div className="font-display text-4xl">{stats.threads ?? 0}</div></div>
        <div className="brutal-card p-5 bg-[#00C3FF]"><div className="font-mono text-xs uppercase">Comments</div><div className="font-display text-4xl">{stats.comments ?? 0}</div></div>
        <div className="brutal-card p-5 bg-[#FFD700]"><div className="font-mono text-xs uppercase">Users</div><div className="font-display text-4xl">{stats.users ?? 0}</div></div>
      </div>

      <h2 className="font-display text-2xl mb-3">ALL THREADS</h2>
      <div className="brutal-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#09090B] text-white">
            <tr><th className="text-left p-3">Title</th><th className="p-3">Cat</th><th className="p-3">Score</th><th className="p-3">Pin</th><th className="p-3">Lock</th><th className="p-3">Actions</th></tr>
          </thead>
          <tbody>
            {threads.map((t) => (
              <tr key={t.thread_id} className="border-t-2 border-[#09090B]" data-testid={`admin-row-${t.thread_id}`}>
                <td className="p-3 max-w-xs truncate"><Link to={`/thread/${t.thread_id}`} className="font-bold hover:text-[#FF4500]">{t.title}</Link></td>
                <td className="p-3 text-center font-mono text-xs">{t.category}</td>
                <td className="p-3 text-center font-mono">{t.score}</td>
                <td className="p-3 text-center">{t.is_pinned ? "✓" : ""}</td>
                <td className="p-3 text-center">{t.is_locked ? "✓" : ""}</td>
                <td className="p-3 flex gap-2 justify-center">
                  <button onClick={() => togglePin(t.thread_id)} className="p-2 border-2 border-[#09090B] hover:bg-[#FFD700]" data-testid={`admin-pin-${t.thread_id}`}><PushPin weight="bold" size={14}/></button>
                  <button onClick={() => toggleLock(t.thread_id)} className="p-2 border-2 border-[#09090B] hover:bg-[#00C3FF]" data-testid={`admin-lock-${t.thread_id}`}><Lock weight="bold" size={14}/></button>
                  <button onClick={() => del(t.thread_id)} className="p-2 border-2 border-[#09090B] hover:bg-[#FF4500] hover:text-white" data-testid={`admin-delete-${t.thread_id}`}><Trash weight="bold" size={14}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, API, formatErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import ThreadCard from "@/components/ThreadCard";
import { Lightning, Image as ImageIcon, ShieldStar } from "@phosphor-icons/react";

const resolveImg = (url) => !url ? null : url.startsWith("http") ? url : `${API.replace("/api","")}${url}`;

export default function Profile() {
  const { id } = useParams();
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [threads, setThreads] = useState([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get(`/users/${id}/threads`),
      ]);
      setProfile(pRes.data);
      setName(pRes.data.name);
      setBio(pRes.data.bio || "");
      setThreads(tRes.data);
    } catch { toast.error("User not found"); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const isMe = user && user.user_id === id;

  const save = async () => {
    try {
      const { data } = await api.put("/users/me", { name, bio });
      setProfile(data); setUser(data); setEditing(false);
      toast.success("Profile updated");
    } catch (ex) { toast.error(formatErr(ex.response?.data?.detail) || "Failed"); }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const updated = await api.put("/users/me", { avatar_url: data.url });
      setProfile(updated.data); setUser(updated.data);
      toast.success("Avatar updated");
    } catch (ex) { toast.error(formatErr(ex.response?.data?.detail) || "Upload failed"); }
    finally { setUploading(false); }
  };

  if (!profile) return <div className="p-8 max-w-4xl mx-auto"><div className="brutal-card h-32 animate-pulse bg-zinc-100" /></div>;

  const avatar = resolveImg(profile.avatar_url);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="profile-page">
      <div className="brutal-card p-6 bg-[#FFD700] mb-6 flex items-start gap-5 flex-wrap">
        <div className="relative">
          <div className="w-24 h-24 border-[3px] border-[#09090B] brutal-shadow bg-[#FF007F] overflow-hidden">
            {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <span className="font-display text-white text-4xl flex items-center justify-center h-full">{profile.name?.[0]?.toUpperCase()}</span>}
          </div>
          {isMe && (
            <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border-[3px] border-[#09090B] flex items-center justify-center cursor-pointer hover:bg-[#39FF14]" data-testid="upload-avatar-btn">
              <ImageIcon weight="bold" size={14} />
              <input type="file" accept="image/*" hidden onChange={uploadAvatar} disabled={uploading} />
            </label>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-3">
              <input data-testid="profile-name-input" value={name} onChange={(e) => setName(e.target.value)} className="brutal-input bg-white" />
              <textarea data-testid="profile-bio-input" value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className="brutal-input bg-white" placeholder="Tell us something" />
              <div className="flex gap-2">
                <button onClick={save} className="brutal-btn" data-testid="save-profile">SAVE</button>
                <button onClick={() => setEditing(false)} className="brutal-btn brutal-btn--ghost">CANCEL</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="font-display text-4xl flex items-center gap-2">
                {profile.name}
                {profile.role === "admin" && <span className="bg-[#09090B] text-white text-xs px-2 py-1 flex items-center gap-1 font-display"><ShieldStar weight="fill" size={12}/>ADMIN</span>}
              </h1>
              <p className="text-sm font-mono text-zinc-700 mt-1">{profile.email}</p>
              {profile.bio && <p className="mt-2">{profile.bio}</p>}
              <div className="mt-3 flex gap-3 font-mono text-sm flex-wrap">
                <span className="bg-white border-2 border-[#09090B] px-3 py-1"><Lightning weight="bold" size={12} className="inline mr-1"/>{profile.karma} karma</span>
                <span className="bg-white border-2 border-[#09090B] px-3 py-1">{threads.length} threads</span>
                <span className="bg-white border-2 border-[#09090B] px-3 py-1">Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
              {isMe && <button data-testid="edit-profile-btn" onClick={() => setEditing(true)} className="brutal-btn brutal-btn--secondary mt-4">EDIT PROFILE</button>}
            </>
          )}
        </div>
      </div>

      <h2 className="font-display text-2xl mb-4">THREADS BY {profile.name.toUpperCase()}</h2>
      {threads.length === 0 ? (
        <div className="brutal-card p-6 text-center">No threads yet.</div>
      ) : (
        <div className="space-y-4" data-testid="user-threads">
          {threads.map((t) => <ThreadCard key={t.thread_id} thread={t} />)}
        </div>
      )}
    </div>
  );
}

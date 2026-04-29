import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, API, formatErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import VoteButtons from "@/components/VoteButtons";
import Markdown from "@/components/Markdown";
import { toast } from "sonner";
import { PushPin, Lock, Trash, ChatCircle, ShieldStar } from "@phosphor-icons/react";

const resolveImg = (url) => !url ? null : url.startsWith("http") ? url : `${API.replace("/api","")}${url}`;

function Comment({ c, onVote, onDelete }) {
  const avatar = resolveImg(c.author_avatar);
  return (
    <div className="brutal-card p-4 flex gap-3" data-testid={`comment-${c.comment_id}`}>
      <VoteButtons targetId={c.comment_id} targetType="comment" initial={{ score: c.score, user_vote: c.user_vote }} onChange={onVote} vertical={true} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 text-sm">
          <Link to={`/profile/${c.author_id}`} className="flex items-center gap-2 font-bold hover:text-[#FF4500]">
            <div className="w-6 h-6 border-2 border-[#09090B] bg-[#FF007F] overflow-hidden">
              {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-white text-xs flex justify-center items-center h-full font-display">{c.author_name?.[0]?.toUpperCase()}</span>}
            </div>
            {c.author_name}
          </Link>
          <span className="text-xs text-zinc-500 font-mono">{new Date(c.created_at).toLocaleString()}</span>
          <button onClick={() => onDelete(c.comment_id)} className="ml-auto text-zinc-400 hover:text-[#FF4500]" data-testid={`delete-comment-${c.comment_id}`}>
            <Trash size={14} weight="bold" />
          </button>
        </div>
        <Markdown>{c.body}</Markdown>
      </div>
    </div>
  );
}

export default function Thread() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [tRes, cRes] = await Promise.all([
        api.get(`/threads/${id}`),
        api.get(`/threads/${id}/comments`),
      ]);
      setThread(tRes.data);
      setComments(cRes.data);
    } catch {
      toast.error("Thread not found");
      nav("/");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const postComment = async (e) => {
    e.preventDefault();
    if (!user) { toast.error("Sign in to comment"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/comments", { thread_id: id, body: reply });
      setComments([...comments, data]);
      setReply("");
    } catch (ex) {
      toast.error(formatErr(ex.response?.data?.detail) || "Failed");
    } finally { setBusy(false); }
  };

  const deleteComment = async (cid) => {
    if (!window.confirm("Delete comment?")) return;
    try { await api.delete(`/comments/${cid}`); setComments(comments.filter(c => c.comment_id !== cid)); } catch {}
  };

  const togglePin = async () => {
    try { await api.post(`/threads/${id}/pin`); load(); toast.success("Updated"); } catch { toast.error("Failed"); }
  };
  const toggleLock = async () => {
    try { await api.post(`/threads/${id}/lock`); load(); toast.success("Updated"); } catch { toast.error("Failed"); }
  };
  const deleteThread = async () => {
    if (!window.confirm("Delete thread?")) return;
    try { await api.delete(`/threads/${id}`); toast.success("Deleted"); nav("/"); } catch { toast.error("Failed"); }
  };

  if (!thread) return <div className="p-8 max-w-3xl mx-auto"><div className="brutal-card h-40 animate-pulse bg-zinc-100" /></div>;
  const img = resolveImg(thread.image_url);
  const avatar = resolveImg(thread.author_avatar);
  const isOwner = user && (user.user_id === thread.author_id);
  const isAdmin = user?.role === "admin";

  return (
    <div className="max-w-3xl mx-auto px-4 py-6" data-testid="thread-page">
      <article className="brutal-card p-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Link to={`/c/${thread.category}`} className="text-xs font-bold uppercase tracking-widest border-2 border-[#09090B] px-2 py-0.5 bg-[#FF4500] text-white">/{thread.category}</Link>
          {thread.is_pinned && <span className="text-xs font-bold flex items-center gap-1 bg-[#FFD700] border-2 border-[#09090B] px-2 py-0.5 uppercase"><PushPin weight="fill" size={12}/>Pinned</span>}
          {thread.is_locked && <span className="text-xs font-bold flex items-center gap-1 bg-[#09090B] text-white border-2 border-[#09090B] px-2 py-0.5 uppercase"><Lock weight="fill" size={12}/>Locked</span>}
          <span className="ml-auto text-xs font-mono text-zinc-500">{new Date(thread.created_at).toLocaleString()}</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl leading-tight" data-testid="thread-title">{thread.title}</h1>

        <Link to={`/profile/${thread.author_id}`} className="inline-flex items-center gap-2 mt-3 text-sm font-bold hover:text-[#FF4500]">
          <div className="w-7 h-7 border-2 border-[#09090B] bg-[#FF007F] overflow-hidden">
            {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" /> : <span className="text-white text-xs flex justify-center items-center h-full font-display">{thread.author_name?.[0]?.toUpperCase()}</span>}
          </div>
          {thread.author_name}
        </Link>

        {img && <div className="mt-4 border-[3px] border-[#09090B]"><img src={img} alt="" className="w-full" /></div>}

        <div className="mt-5"><Markdown>{thread.body}</Markdown></div>

        {thread.tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {thread.tags.map((t) => <Link key={t} to={`/?tag=${t}`} className="tag-chip">#{t}</Link>)}
          </div>
        )}

        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <VoteButtons targetId={thread.thread_id} targetType="thread" initial={{ score: thread.score, user_vote: thread.user_vote }} onChange={(d) => setThread({...thread, ...d})} vertical={false} />
          {isAdmin && <>
            <button onClick={togglePin} className="brutal-btn brutal-btn--yellow text-xs" data-testid="pin-btn"><PushPin weight="bold" size={14}/>{thread.is_pinned ? "Unpin" : "Pin"}</button>
            <button onClick={toggleLock} className="brutal-btn brutal-btn--ghost text-xs" data-testid="lock-btn"><Lock weight="bold" size={14}/>{thread.is_locked ? "Unlock" : "Lock"}</button>
          </>}
          {(isOwner || isAdmin) && <button onClick={deleteThread} className="brutal-btn brutal-btn--ghost text-xs" data-testid="delete-thread-btn"><Trash weight="bold" size={14}/>Delete</button>}
        </div>
      </article>

      <section className="mt-8" data-testid="comments-section">
        <h2 className="font-display text-2xl mb-4 flex items-center gap-2"><ChatCircle weight="fill" size={24} color="#FF007F" /> {comments.length} COMMENTS</h2>
        {!thread.is_locked && user && (
          <form onSubmit={postComment} className="brutal-card p-4 mb-5">
            <textarea data-testid="comment-input" value={reply} onChange={(e) => setReply(e.target.value)} required rows={3} placeholder="Write a thoughtful reply… markdown ok" className="brutal-input" />
            <button data-testid="submit-comment" disabled={busy} className="brutal-btn brutal-btn--pink mt-3">{busy ? "POSTING…" : "REPLY"}</button>
          </form>
        )}
        {thread.is_locked && <div className="brutal-card p-4 bg-[#FFD700] flex items-center gap-2 mb-5"><Lock weight="bold"/> This thread is locked. No new comments allowed.</div>}
        {!user && <div className="brutal-card p-4 mb-5"><Link to="/login" className="font-bold underline text-[#FF4500]">Sign in</Link> to join the conversation.</div>}

        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="brutal-card p-6 text-center"><p className="font-display text-xl">NO REPLIES YET</p><p className="text-sm">Be the bold one.</p></div>
          ) : comments.map((c) => (
            <Comment key={c.comment_id} c={c} onVote={(d) => setComments(prev => prev.map(x => x.comment_id === d.comment_id ? { ...x, ...d } : x))} onDelete={deleteComment} />
          ))}
        </div>
      </section>
    </div>
  );
}

import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, API, formatErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import VoteButtons from "@/components/VoteButtons";
import Markdown from "@/components/Markdown";
import { toast } from "sonner";
import { PushPin, Lock, Trash, ChatCircle, ArrowBendUpLeft, Pencil } from "@phosphor-icons/react";

const resolveImg = (url) => !url ? null : url.startsWith("http") ? url : `${API.replace("/api","")}${url}`;
const MAX_DEPTH = 5;

function flattenTree(list, collapsed) {
  // Sort children under each parent by created_at, then walk in DFS order
  const childrenOf = {};
  list.forEach((c) => {
    const parent = c.parent_id || "__root__";
    (childrenOf[parent] = childrenOf[parent] || []).push(c);
  });
  Object.values(childrenOf).forEach((arr) => arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
  const out = [];
  const walk = (parentKey, depth) => {
    const arr = childrenOf[parentKey] || [];
    arr.forEach((c) => {
      const kids = childrenOf[c.comment_id] || [];
      const childCount = countDescendants(c.comment_id, childrenOf);
      out.push({ comment: c, depth, childCount });
      if (!collapsed.has(c.comment_id)) walk(c.comment_id, depth + 1);
    });
  };
  walk("__root__", 0);
  return out;
}

function countDescendants(id, childrenOf) {
  const stack = [id];
  let n = 0;
  while (stack.length) {
    const cur = stack.pop();
    const kids = childrenOf[cur] || [];
    n += kids.length;
    for (const k of kids) stack.push(k.comment_id);
  }
  return n;
}

function CommentRow({ comment, depth, childCount, collapsed, onToggleCollapse, onVote, onDelete, onEdit, currentUserId, isAdmin, threadLocked, replyingTo, setReplyingTo, replyBody, setReplyBody, onReply, busy, editingId, setEditingId, editBody, setEditBody }) {
  const c = comment;
  const avatar = resolveImg(c.author_avatar);
  const indent = Math.min(depth, MAX_DEPTH);
  const isCollapsed = collapsed.has(c.comment_id);
  const canEdit = currentUserId === c.author_id || isAdmin;
  const canDelete = currentUserId === c.author_id || isAdmin;
  const isEditing = editingId === c.comment_id;
  return (
    <div
      data-testid={`comment-${c.comment_id}`}
      style={{ marginLeft: indent * 28 }}
      className={indent > 0 ? "border-l-[3px] border-[#09090B] pl-4" : ""}
    >
      <div className="brutal-card p-4 flex gap-3">
        <VoteButtons targetId={c.comment_id} targetType="comment" initial={{ score: c.score, user_vote: c.user_vote }} onChange={onVote} vertical={true} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-sm flex-wrap">
            {childCount > 0 && (
              <button
                onClick={() => onToggleCollapse(c.comment_id)}
                className="w-5 h-5 border-2 border-[#09090B] bg-[#EFE4D2] text-[10px] font-bold flex items-center justify-center hover:bg-[#9B2C2C] hover:text-white"
                aria-label={isCollapsed ? "Proširi" : "Sažmi"}
                data-testid={`toggle-collapse-${c.comment_id}`}
              >
                {isCollapsed ? "+" : "−"}
              </button>
            )}
            <Link to={`/profile/${c.author_id}`} className="flex items-center gap-2 font-bold hover:text-[#9B2C2C]">
              <div className="w-6 h-6 border-2 border-[#09090B] bg-[#A23B47] overflow-hidden">
                {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-white text-xs flex justify-center items-center h-full font-display">{c.author_name?.[0]?.toUpperCase()}</span>}
              </div>
              {c.author_name}
            </Link>
            <span className="text-xs text-zinc-500 font-mono">{new Date(c.created_at).toLocaleString()}</span>
            {c.edited_at && <span className="text-xs italic text-zinc-400">(izmenjeno)</span>}
            {isCollapsed && childCount > 0 && (
              <span className="text-xs font-bold text-[#1E3A5F]">[{childCount} skrivenih]</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {canEdit && !isEditing && (
                <button
                  onClick={() => { setEditingId(c.comment_id); setEditBody(c.body); }}
                  className="text-zinc-400 hover:text-[#1E3A5F]"
                  data-testid={`edit-comment-${c.comment_id}`}
                  aria-label="Uredi"
                >
                  <Pencil size={14} weight="bold" />
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete(c.comment_id)} className="text-zinc-400 hover:text-[#9B2C2C]" data-testid={`delete-comment-${c.comment_id}`} aria-label="Obriši">
                  <Trash size={14} weight="bold" />
                </button>
              )}
            </div>
          </div>
          {isEditing ? (
            <form
              onSubmit={(e) => { e.preventDefault(); onEdit(c.comment_id, editBody); }}
              data-testid={`edit-form-${c.comment_id}`}
            >
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                required
                rows={3}
                className="brutal-input"
                data-testid={`edit-input-${c.comment_id}`}
              />
              <div className="mt-2 flex gap-2">
                <button disabled={busy} className="brutal-btn text-xs" data-testid={`save-edit-${c.comment_id}`}>{busy ? "ČUVANJE…" : "SAČUVAJ"}</button>
                <button type="button" onClick={() => { setEditingId(null); setEditBody(""); }} className="brutal-btn brutal-btn--ghost text-xs">OTKAŽI</button>
              </div>
            </form>
          ) : (
            <Markdown>{c.body}</Markdown>
          )}
          {!threadLocked && (
            <button
              onClick={() => setReplyingTo(replyingTo === c.comment_id ? null : c.comment_id)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[#1E3A5F] hover:text-[#9B2C2C]"
              data-testid={`reply-btn-${c.comment_id}`}
            >
              <ArrowBendUpLeft weight="bold" size={14} /> Odgovori
            </button>
          )}
          {replyingTo === c.comment_id && (
            <form
              onSubmit={(e) => { e.preventDefault(); onReply(c.comment_id); }}
              className="mt-3 brutal-card p-3 bg-[#EFE4D2]"
              data-testid={`reply-form-${c.comment_id}`}
            >
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                required
                rows={2}
                placeholder="Tvoj odgovor… markdown ok"
                className="brutal-input bg-white"
                data-testid={`reply-input-${c.comment_id}`}
              />
              <div className="mt-2 flex gap-2">
                <button disabled={busy} className="brutal-btn text-xs" data-testid={`submit-reply-${c.comment_id}`}>{busy ? "SLANJE…" : "POŠALJI"}</button>
                <button type="button" onClick={() => { setReplyingTo(null); setReplyBody(""); }} className="brutal-btn brutal-btn--ghost text-xs">OTKAŽI</button>
              </div>
            </form>
          )}
        </div>
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
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState("");
  // Thread edit state
  const [editingThread, setEditingThread] = useState(false);
  const [tEditTitle, setTEditTitle] = useState("");
  const [tEditBody, setTEditBody] = useState("");
  const [tEditCategory, setTEditCategory] = useState("");
  const [tEditTags, setTEditTags] = useState("");
  const [categories, setCategories] = useState([]);

  useEffect(() => { api.get("/categories").then(r => setCategories(r.data)).catch(() => {}); }, []);

  const toggleCollapse = (id) => {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const editComment = async (cid, body) => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.put(`/comments/${cid}`, { body });
      setComments((prev) => prev.map((x) => x.comment_id === cid ? { ...x, ...data } : x));
      setEditingId(null);
      setEditBody("");
      toast.success("Izmenjeno");
    } catch (ex) {
      toast.error(formatErr(ex.response?.data?.detail) || "Greška");
    } finally { setBusy(false); }
  };

  const startEditThread = () => {
    if (!thread) return;
    setTEditTitle(thread.title);
    setTEditBody(thread.body);
    setTEditCategory(thread.category);
    setTEditTags((thread.tags || []).join(", "));
    setEditingThread(true);
  };

  const saveThread = async () => {
    setBusy(true);
    try {
      const { data } = await api.put(`/threads/${id}`, {
        title: tEditTitle,
        body: tEditBody,
        category: tEditCategory,
        tags: tEditTags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setThread(data);
      setEditingThread(false);
      toast.success("Tema izmenjena");
    } catch (ex) {
      toast.error(formatErr(ex.response?.data?.detail) || "Greška");
    } finally { setBusy(false); }
  };

  const flat = useMemo(() => flattenTree(comments, collapsed), [comments, collapsed]);

  const load = async () => {
    try {
      const [tRes, cRes] = await Promise.all([
        api.get(`/threads/${id}`),
        api.get(`/threads/${id}/comments`),
      ]);
      setThread(tRes.data);
      setComments(cRes.data);
    } catch {
      toast.error("Tema nije pronađena");
      nav("/");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const postRoot = async (e) => {
    e.preventDefault();
    if (!user) { toast.error("Prijavi se za komentar"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/comments", { thread_id: id, body: reply });
      setComments([...comments, data]);
      setReply("");
    } catch (ex) {
      toast.error(formatErr(ex.response?.data?.detail) || "Greška");
    } finally { setBusy(false); }
  };

  const postReply = async (parentId) => {
    if (!user) { toast.error("Prijavi se za odgovor"); return; }
    if (!replyBody.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post("/comments", { thread_id: id, body: replyBody, parent_id: parentId });
      setComments([...comments, data]);
      setReplyBody("");
      setReplyingTo(null);
    } catch (ex) {
      toast.error(formatErr(ex.response?.data?.detail) || "Greška");
    } finally { setBusy(false); }
  };

  const deleteComment = async (cid) => {
    if (!window.confirm("Obrisati komentar?")) return;
    try { await api.delete(`/comments/${cid}`); setComments(comments.filter(c => c.comment_id !== cid)); } catch {}
  };

  const onVote = (d) => setComments(prev => prev.map(x => x.comment_id === d.comment_id ? { ...x, ...d } : x));

  const togglePin = async () => { try { await api.post(`/threads/${id}/pin`); load(); toast.success("Ažurirano"); } catch { toast.error("Greška"); } };
  const toggleLock = async () => { try { await api.post(`/threads/${id}/lock`); load(); toast.success("Ažurirano"); } catch { toast.error("Greška"); } };
  const deleteThread = async () => {
    if (!window.confirm("Obrisati temu?")) return;
    try { await api.delete(`/threads/${id}`); toast.success("Obrisano"); nav("/"); } catch { toast.error("Greška"); }
  };

  if (!thread) return <div className="p-8 max-w-3xl mx-auto"><div className="brutal-card h-40 animate-pulse bg-zinc-100" /></div>;
  const img = resolveImg(thread.image_url);
  const avatar = resolveImg(thread.author_avatar);
  const isOwner = user && (user.user_id === thread.author_id);
  const isAdmin = user?.role === "admin";

  return (
    <div className="max-w-3xl mx-auto px-4 py-6" data-testid="thread-page">
      <article className="brutal-card p-6">
        {editingThread ? (
          <form onSubmit={(e) => { e.preventDefault(); saveThread(); }} className="space-y-3" data-testid="edit-thread-form">
            <select value={tEditCategory} onChange={(e) => setTEditCategory(e.target.value)} className="brutal-input">
              {categories.map((c) => <option key={c.slug} value={c.slug}>/{c.slug}</option>)}
            </select>
            <input value={tEditTitle} onChange={(e) => setTEditTitle(e.target.value)} required className="brutal-input" placeholder="Naslov" data-testid="edit-thread-title" />
            <textarea value={tEditBody} onChange={(e) => setTEditBody(e.target.value)} required rows={8} className="brutal-input font-mono text-sm" placeholder="Sadržaj" data-testid="edit-thread-body" />
            <input value={tEditTags} onChange={(e) => setTEditTags(e.target.value)} className="brutal-input" placeholder="Tagovi (zarezima)" data-testid="edit-thread-tags" />
            <div className="flex gap-2">
              <button disabled={busy} className="brutal-btn" data-testid="save-thread-edit">{busy ? "ČUVANJE…" : "SAČUVAJ"}</button>
              <button type="button" onClick={() => setEditingThread(false)} className="brutal-btn brutal-btn--ghost">OTKAŽI</button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Link to={`/c/${thread.category}`} className="text-xs font-bold uppercase tracking-widest border-2 border-[#09090B] px-2 py-0.5 bg-[#9B2C2C] text-white">/{thread.category}</Link>
              {thread.is_pinned && <span className="text-xs font-bold flex items-center gap-1 bg-[#EFE4D2] border-2 border-[#09090B] px-2 py-0.5 uppercase"><PushPin weight="fill" size={12}/>Zakačeno</span>}
              {thread.is_locked && <span className="text-xs font-bold flex items-center gap-1 bg-[#09090B] text-white border-2 border-[#09090B] px-2 py-0.5 uppercase"><Lock weight="fill" size={12}/>Zaključano</span>}
              <span className="ml-auto text-xs font-mono text-zinc-500">{new Date(thread.created_at).toLocaleString()}{thread.edited_at && " · izmenjeno"}</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl leading-tight" data-testid="thread-title">{thread.title}</h1>

            <Link to={`/profile/${thread.author_id}`} className="inline-flex items-center gap-2 mt-3 text-sm font-bold hover:text-[#9B2C2C]">
              <div className="w-7 h-7 border-2 border-[#09090B] bg-[#A23B47] overflow-hidden">
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
                <button onClick={togglePin} className="brutal-btn brutal-btn--yellow text-xs" data-testid="pin-btn"><PushPin weight="bold" size={14}/>{thread.is_pinned ? "Otkači" : "Zakači"}</button>
                <button onClick={toggleLock} className="brutal-btn brutal-btn--ghost text-xs" data-testid="lock-btn"><Lock weight="bold" size={14}/>{thread.is_locked ? "Otključaj" : "Zaključaj"}</button>
              </>}
              {(isOwner || isAdmin) && (
                <>
                  <button onClick={startEditThread} className="brutal-btn brutal-btn--secondary text-xs" data-testid="edit-thread-btn"><Pencil weight="bold" size={14}/>Uredi</button>
                  <button onClick={deleteThread} className="brutal-btn brutal-btn--ghost text-xs" data-testid="delete-thread-btn"><Trash weight="bold" size={14}/>Obriši</button>
                </>
              )}
            </div>
          </>
        )}
      </article>

      <section className="mt-8" data-testid="comments-section">
        <h2 className="font-display text-2xl mb-4 flex items-center gap-2"><ChatCircle weight="fill" size={24} color="#A23B47" /> {comments.length} KOMENTARA</h2>
        {!thread.is_locked && user && (
          <form onSubmit={postRoot} className="brutal-card p-4 mb-5">
            <textarea data-testid="comment-input" value={reply} onChange={(e) => setReply(e.target.value)} required rows={3} placeholder="Napiši komentar… markdown podržan" className="brutal-input" />
            <button data-testid="submit-comment" disabled={busy} className="brutal-btn brutal-btn--pink mt-3">{busy ? "SLANJE…" : "ODGOVORI"}</button>
          </form>
        )}
        {thread.is_locked && <div className="brutal-card p-4 bg-[#EFE4D2] flex items-center gap-2 mb-5"><Lock weight="bold"/> Tema je zaključana. Novi komentari nisu dozvoljeni.</div>}
        {!user && <div className="brutal-card p-4 mb-5"><Link to="/login" className="font-bold underline text-[#9B2C2C]">Prijavi se</Link> da bi učestvovao u razgovoru.</div>}

        <div className="space-y-3">
          {flat.length === 0 ? (
            <div className="brutal-card p-6 text-center"><p className="font-display text-xl">JOŠ NEMA ODGOVORA</p><p className="text-sm">Budi prvi.</p></div>
          ) : flat.map(({ comment, depth, childCount }) => (
            <CommentRow
              key={comment.comment_id}
              comment={comment}
              depth={depth}
              childCount={childCount}
              collapsed={collapsed}
              onToggleCollapse={toggleCollapse}
              onVote={onVote}
              onDelete={deleteComment}
              onEdit={editComment}
              currentUserId={user?.user_id}
              isAdmin={user?.role === "admin"}
              onReply={postReply}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyBody={replyBody}
              setReplyBody={setReplyBody}
              busy={busy}
              threadLocked={thread.is_locked}
              editingId={editingId}
              setEditingId={setEditingId}
              editBody={editBody}
              setEditBody={setEditBody}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

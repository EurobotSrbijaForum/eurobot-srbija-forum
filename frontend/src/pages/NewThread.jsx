import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Markdown from "@/components/Markdown";
import { Image as ImageIcon, Eye, Pencil, X } from "@phosphor-icons/react";
import { API, formatErr } from "@/lib/api";

export default function NewThread() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) nav("/login");
    api.get("/categories").then(r => setCategories(r.data));
  }, [user, nav]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Slika prelazi 5MB limit za naslovnu");
      e.target.value = "";
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/upload?purpose=cover", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setImgUrl(data.url);
      toast.success("Slika otpremljena");
    } catch (ex) {
      toast.error(formatErr(ex.response?.data?.detail) || "Otpremanje neuspelo");
    } finally { setUploading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/threads", {
        title, body, category, image_url: imgUrl || null,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean)
      });
      toast.success("Posted!");
      nav(`/thread/${data.thread_id}`);
    } catch (ex) {
      toast.error(formatErr(ex.response?.data?.detail) || "Post failed");
    } finally { setBusy(false); }
  };

  const imgPreview = imgUrl?.startsWith("http") ? imgUrl : (imgUrl ? `${API.replace("/api","")}${imgUrl}` : null);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" data-testid="new-thread-page">
      <h1 className="font-display text-4xl mb-6">NOVA TEMA</h1>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-xs uppercase font-bold tracking-widest mb-1">Kategorija</label>
          <select data-testid="category-select" value={category} onChange={(e) => setCategory(e.target.value)} className="brutal-input">
            {categories.map((c) => <option key={c.slug} value={c.slug}>/{c.slug} — {c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase font-bold tracking-widest mb-1">Naslov</label>
          <input data-testid="title-input" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Šta želiš da podeliš?" className="brutal-input" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs uppercase font-bold tracking-widest">Sadržaj (Markdown podržan)</label>
            <button type="button" data-testid="toggle-preview" onClick={() => setPreview(!preview)} className="text-xs font-bold flex items-center gap-1 underline">
              {preview ? <><Pencil size={12} weight="bold" /> Izmeni</> : <><Eye size={12} weight="bold" /> Pregled</>}
            </button>
          </div>
          {preview ? (
            <div className="brutal-input min-h-[240px] bg-[#EFE4D2]"><Markdown>{body}</Markdown></div>
          ) : (
            <textarea data-testid="body-input" required value={body} onChange={(e) => setBody(e.target.value)} rows={10} placeholder="**Bold** _italic_ `code` …" className="brutal-input font-mono text-sm" />
          )}
        </div>

        <div>
          <label className="block text-xs uppercase font-bold tracking-widest mb-1">Tagovi (razdvojeni zarezima, max 5)</label>
          <input data-testid="tags-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="robotika, eurobot, saveti" className="brutal-input" />
        </div>

        <div>
          <label className="block text-xs uppercase font-bold tracking-widest mb-1">Naslovna slika (opciono, max 5MB)</label>
          {imgPreview ? (
            <div className="relative inline-block">
              <img src={imgPreview} alt="" className="max-h-48 border-[3px] border-[#09090B] brutal-shadow" />
              <button type="button" onClick={() => setImgUrl("")} className="absolute -top-2 -right-2 w-7 h-7 bg-[#9B2C2C] text-white border-[3px] border-[#09090B]" data-testid="remove-image"><X weight="bold" /></button>
            </div>
          ) : (
            <label className="brutal-btn brutal-btn--secondary cursor-pointer w-fit" data-testid="upload-image-btn">
              <ImageIcon weight="bold" size={16} /> {uploading ? "OTPREMANJE…" : "OTPREMI SLIKU"}
              <input type="file" accept="image/*" hidden onChange={upload} disabled={uploading} />
            </label>
          )}
        </div>

        <button data-testid="submit-thread" disabled={busy} className="brutal-btn">{busy ? "OBJAVLJIVANJE…" : "OBJAVI TEMU"}</button>
      </form>
    </div>
  );
}

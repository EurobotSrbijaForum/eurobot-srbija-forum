import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import ThreadCard from "@/components/ThreadCard";
import { Fire, Clock, TrendUp, Sparkle } from "@phosphor-icons/react";

const SORTS = [
  { key: "hot", label: "Popularno", icon: Fire, color: "#9B2C2C" },
  { key: "new", label: "Najnovije", icon: Clock, color: "#1E3A5F" },
  { key: "top", label: "Najbolje", icon: TrendUp, color: "#A23B47" },
];

const CAT_BG = {
  general: "#9B2C2C", tech: "#1E3A5F", design: "#A23B47",
  gaming: "#7A8B5C", music: "#EFE4D2", random: "#5C5470",
};

export default function Home({ category = null }) {
  const [params, setParams] = useSearchParams();
  const [threads, setThreads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState({ threads: 0, comments: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const sort = params.get("sort") || "hot";
  const tag = params.get("tag");

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, cRes, tagRes, sRes] = await Promise.all([
        api.get("/threads", { params: { category: category || undefined, sort, tag: tag || undefined } }),
        api.get("/categories"),
        api.get("/tags/popular"),
        api.get("/stats"),
      ]);
      setThreads(tRes.data);
      setCategories(cRes.data);
      setTags(tagRes.data);
      setStats(sRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sort, category, tag]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" data-testid="home-page">
      {!category && (
        <section className="mb-8 brutal-card p-8 bg-[#EFE4D2]" data-testid="hero">
          <div className="flex items-start gap-4 flex-wrap">
            <Sparkle weight="fill" size={48} className="text-[#9B2C2C]" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-4xl sm:text-6xl leading-none">DOBRODOŠLI<br/>NA FORUM.</h1>
              <p className="mt-3 max-w-xl text-base font-medium">Mesto za diskusije, projekte i druženje srpske Eurobot zajednice. Pridruži se razgovoru.</p>
              <div className="mt-4 flex gap-3 flex-wrap font-mono text-sm">
                <span className="bg-white border-2 border-[#09090B] px-3 py-1">{stats.threads} tema</span>
                <span className="bg-white border-2 border-[#09090B] px-3 py-1">{stats.comments} komentara</span>
                <span className="bg-white border-2 border-[#09090B] px-3 py-1">{stats.users} članova</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <main>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h2 className="font-display text-3xl">
              {category ? `/c/${category}` : "NOVE TEME"}
            </h2>
            <div className="flex gap-2">
              {SORTS.map((s) => {
                const Icon = s.icon;
                const active = sort === s.key;
                return (
                  <button
                    key={s.key}
                    data-testid={`sort-${s.key}`}
                    onClick={() => { params.set("sort", s.key); setParams(params); }}
                    className="brutal-btn"
                    style={{ background: active ? s.color : "white", color: active && !["#EFE4D2","#7A8B5C"].includes(s.color) ? "white" : "#09090B" }}
                  >
                    <Icon weight="bold" size={14} /> {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {tag && (
            <div className="mb-4 flex items-center gap-2 text-sm">
              <span>Filter po tagu:</span>
              <span className="tag-chip">{tag}</span>
              <button onClick={() => { params.delete("tag"); setParams(params); }} className="underline font-bold" data-testid="clear-tag">poništi</button>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="brutal-card h-32 animate-pulse bg-zinc-100" />)}</div>
          ) : threads.length === 0 ? (
            <div className="brutal-card p-10 text-center">
              <p className="font-display text-2xl">JOŠ NIŠTA OVDE</p>
              <p className="mt-2">Budi prvi koji će objaviti temu!</p>
              <Link to="/new" className="brutal-btn mt-4 inline-flex">Pokreni temu</Link>
            </div>
          ) : (
            <div className="space-y-5" data-testid="thread-list">
              {threads.map((t) => <ThreadCard key={t.thread_id} thread={t} onChange={(d) => setThreads(prev => prev.map(x => x.thread_id === d.thread_id ? { ...x, ...d } : x))} />)}
            </div>
          )}
        </main>

        <aside className="space-y-5">
          <div className="brutal-card p-5" data-testid="categories-widget">
            <h3 className="font-display text-xl mb-3">KATEGORIJE</h3>
            <div className="space-y-2">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  to={`/c/${c.slug}`}
                  className="flex items-center justify-between p-2 border-2 border-[#09090B] hover:translate-x-1 transition-transform"
                  style={{ background: CAT_BG[c.slug] || "#fff", color: ["general","tech","design","random"].includes(c.slug) ? "white" : "#09090B" }}
                  data-testid={`cat-${c.slug}`}
                >
                  <span className="font-bold uppercase text-sm">/{c.slug}</span>
                  <span className="font-mono text-xs">{c.thread_count}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="brutal-card p-5 bg-[#EFE4D2]" data-testid="tags-widget">
            <h3 className="font-display text-xl mb-3">POPULARNI TAGOVI</h3>
            {tags.length === 0 ? (
              <p className="text-sm">Još nema tagova</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button key={t.tag} onClick={() => { params.set("tag", t.tag); setParams(params); }} className="tag-chip bg-white" data-testid={`tag-${t.tag}`}>
                    #{t.tag} <span className="ml-1 opacity-60">{t.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

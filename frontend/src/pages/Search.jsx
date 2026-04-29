import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import ThreadCard from "@/components/ThreadCard";
import { MagnifyingGlass } from "@phosphor-icons/react";

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    api.get("/threads", { params: { q, sort: "new", limit: 50 } })
      .then(r => setThreads(r.data))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="search-page">
      <div className="brutal-card p-6 bg-[#00C3FF] mb-6 flex items-center gap-3">
        <MagnifyingGlass weight="bold" size={28} />
        <h1 className="font-display text-3xl">RESULTS FOR "{q}"</h1>
      </div>
      {loading ? (
        <div className="brutal-card h-32 animate-pulse bg-zinc-100" />
      ) : threads.length === 0 ? (
        <div className="brutal-card p-8 text-center">
          <p className="font-display text-2xl">NOTHING FOUND 🤷</p>
          <p className="mt-2">No threads matched your search.</p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="search-results">
          {threads.map((t) => <ThreadCard key={t.thread_id} thread={t} />)}
        </div>
      )}
    </div>
  );
}

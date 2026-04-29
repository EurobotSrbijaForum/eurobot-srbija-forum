import React from "react";
import { Link } from "react-router-dom";
import VoteButtons from "./VoteButtons";
import { ChatCircleDots, PushPin, Lock, Tag } from "@phosphor-icons/react";
import { API } from "@/lib/api";

const CAT_COLORS = {
  general: "#9B2C2C", elektronika: "#1E3A5F", programiranje: "#A23B47",
  mehanika: "#7A8B5C", random: "#5C5470",
};

const resolveImg = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API.replace("/api","")}${url}`;
};

export default function ThreadCard({ thread, onChange }) {
  const color = CAT_COLORS[thread.category] || "#9B2C2C";
  const avatar = resolveImg(thread.author_avatar);
  const img = resolveImg(thread.image_url);

  return (
    <article className="brutal-card relative group" data-testid={`thread-card-${thread.thread_id}`}>
      <div className="flex">
        <div className="p-3 flex flex-col items-center gap-1 border-r-[3px] border-[#09090B] bg-[#EFE4D2]">
          <VoteButtons
            targetId={thread.thread_id}
            targetType="thread"
            initial={{ score: thread.score, user_vote: thread.user_vote }}
            onChange={onChange}
            vertical={true}
          />
        </div>

        <div className="flex-1 p-5 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Link
              to={`/c/${thread.category}`}
              className="text-xs font-bold uppercase tracking-widest border-2 border-[#09090B] px-2 py-0.5"
              style={{ background: color, color: ["#EFE4D2","#7A8B5C"].includes(color) ? "#09090B" : "#fff" }}
              data-testid={`cat-link-${thread.thread_id}`}
            >
              {thread.category}
            </Link>
            {thread.is_pinned && (
              <span className="text-xs font-bold flex items-center gap-1 bg-[#EFE4D2] border-2 border-[#09090B] px-2 py-0.5 uppercase">
                <PushPin weight="fill" size={12} /> Pinned
              </span>
            )}
            {thread.is_locked && (
              <span className="text-xs font-bold flex items-center gap-1 bg-[#09090B] text-white border-2 border-[#09090B] px-2 py-0.5 uppercase">
                <Lock weight="fill" size={12} /> Locked
              </span>
            )}
            <span className="text-xs text-zinc-500 ml-auto font-mono">
              {new Date(thread.created_at).toLocaleDateString()}
            </span>
          </div>

          <Link to={`/thread/${thread.thread_id}`} data-testid={`thread-title-${thread.thread_id}`}>
            <h3 className="font-display text-xl sm:text-2xl leading-tight hover:text-[#9B2C2C] transition-colors line-clamp-2">
              {thread.title}
            </h3>
          </Link>

          {img && (
            <div className="mt-3 border-[3px] border-[#09090B] overflow-hidden max-h-64">
              <img src={img} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <p className="mt-2 text-sm text-zinc-700 line-clamp-2">{thread.body?.slice(0, 220)}</p>

          {thread.tags?.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {thread.tags.slice(0, 4).map((t) => (
                <span key={t} className="tag-chip" style={{ background: "#EFE4D2" }}>
                  <Tag weight="bold" size={10} className="mr-1" />{t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
            <Link to={`/profile/${thread.author_id}`} className="flex items-center gap-2 group/author" data-testid={`author-link-${thread.thread_id}`}>
              <div className="w-7 h-7 border-2 border-[#09090B] bg-[#A23B47] overflow-hidden">
                {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" /> : <span className="font-display text-white text-xs flex items-center justify-center h-full">{thread.author_name?.[0]?.toUpperCase()}</span>}
              </div>
              <span className="text-sm font-bold group-hover/author:text-[#9B2C2C]">{thread.author_name}</span>
            </Link>
            <Link to={`/thread/${thread.thread_id}`} className="flex items-center gap-1 text-sm font-bold text-zinc-700 hover:text-[#9B2C2C]" data-testid={`comments-link-${thread.thread_id}`}>
              <ChatCircleDots weight="bold" size={16} /> {thread.comment_count} komentara
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

import React, { useState } from "react";
import { ArrowFatUp, ArrowFatDown } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function VoteButtons({ targetId, targetType, initial, onChange, vertical = true }) {
  const { user } = useAuth();
  const [score, setScore] = useState(initial.score || 0);
  const [vote, setVote] = useState(initial.user_vote || 0);
  const [busy, setBusy] = useState(false);

  const cast = async (val) => {
    if (!user) { toast.error("Sign in to vote"); return; }
    if (busy) return;
    setBusy(true);
    const newVal = vote === val ? 0 : val;
    try {
      const { data } = await api.post("/vote", { target_id: targetId, target_type: targetType, value: newVal });
      setVote(data.user_vote);
      setScore(data.score);
      onChange?.(data);
    } catch (e) {
      toast.error("Vote failed");
    } finally {
      setBusy(false);
    }
  };

  const containerCls = vertical
    ? "flex flex-col items-center bg-[#FFF6CC] border-[3px] border-[#09090B] brutal-shadow w-12 py-2"
    : "flex items-center gap-1 bg-[#FFF6CC] border-[2px] border-[#09090B] px-2 py-1";

  return (
    <div className={containerCls} data-testid={`vote-${targetType}-${targetId}`}>
      <button
        data-testid={`upvote-${targetId}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); cast(1); }}
        className={`p-1 transition-transform ${vote === 1 ? "text-[#FF4500] scale-110" : "text-[#09090B] hover:text-[#FF4500]"}`}
        aria-label="Upvote"
      >
        <ArrowFatUp weight={vote === 1 ? "fill" : "bold"} size={vertical ? 22 : 18} />
      </button>
      <span className={`font-display text-sm ${score > 0 ? "text-[#FF4500]" : score < 0 ? "text-[#00C3FF]" : "text-[#09090B]"}`} data-testid={`score-${targetId}`}>
        {score}
      </span>
      <button
        data-testid={`downvote-${targetId}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); cast(-1); }}
        className={`p-1 transition-transform ${vote === -1 ? "text-[#00C3FF] scale-110" : "text-[#09090B] hover:text-[#00C3FF]"}`}
        aria-label="Downvote"
      >
        <ArrowFatDown weight={vote === -1 ? "fill" : "bold"} size={vertical ? 22 : 18} />
      </button>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Search, Vote, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useGetContestVideoById, useGetAllContestants, useGetContestVotes } from "@/lib/api-client";

export default function ContestVotesPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { data: contestData } = useGetContestVideoById(id || "");
  const { data: contestantsData } = useGetAllContestants({ contestVideoId: id || "", search });
  const { data: votesData } = useGetContestVotes(id || "");

  const contest = contestData?.data;
  const contestants = contestantsData?.data || [];
  const votes = votesData?.data || [];

  const totalVotes = contestants.reduce((sum: number, c: any) => sum + (c.votes || 0), 0);

  if (!id) return <div className="text-center py-20 text-muted-foreground">Contest ID required</div>;
  if (!contest) return <div className="text-center py-20 text-muted-foreground">Contest not found</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vote Tracking</h1>
        <p className="text-muted-foreground text-sm mt-1">{contest.title} — {totalVotes} total votes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase">Participants</span>
          </div>
          <p className="text-2xl font-black text-foreground">{contestants.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Vote className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase">Total Votes</span>
          </div>
          <p className="text-2xl font-black text-foreground">{totalVotes}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase">Avg Votes/Contestant</span>
          </div>
          <p className="text-2xl font-black text-foreground">{contestants.length > 0 ? Math.round(totalVotes / contestants.length) : 0}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Rank</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contestant</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Phone</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Votes</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {contestants.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No contestants yet</td></tr>
            ) : (
              contestants
                .sort((a: any, b: any) => (b.votes || 0) - (a.votes || 0))
                .map((c: any, idx: number) => {
                  const share = totalVotes > 0 ? ((c.votes || 0) / totalVotes) * 100 : 0;
                  return (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="p-4">
                        <Badge variant={idx === 0 ? "default" : "secondary"} className="min-w-[28px] justify-center">
                          #{idx + 1}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-foreground">{c.name}</p>
                          {c.intro && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.intro}</p>}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{c.email || "-"}</td>
                      <td className="p-4 text-muted-foreground">{c.phone || "-"}</td>
                      <td className="p-4 text-right">
                        <span className="text-foreground font-bold">{c.votes || 0}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                            <div className="bg-red-600 h-full rounded-full" style={{ width: `${share.toFixed(1)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{share.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Play, Vote, Lock, CheckCircle2, UserPlus, Trophy, Users, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/api-client";
import { useGetPublicContestById, useInitiateContestPurchase, useVerifyContestPurchase, useVoteContestant, useGetContestVotes } from "@/lib/api-client";

export default function ContestPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data, isLoading, error } = useGetPublicContestById(id || "");
  const voteMutation = useVoteContestant();
  const purchaseInitiate = useInitiateContestPurchase();
  const purchaseVerify = useVerifyContestPurchase();

  const [showPayment, setShowPayment] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orderId, setOrderId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [signature, setSignature] = useState("");
  const [verifying, setVerifying] = useState(false);

  const contest = data?.data;
  const contestants = contest?.contestants || [];
  const hasAccess = contest?.hasAccess || false;
  const isFree = !contest?.price || contest.price <= 0;

  useEffect(() => {
    if (contest && !isFree && !hasPaid && !checkingAccess) {
      setCheckingAccess(true);
      const stored = localStorage.getItem("appUser");
      if (stored) {
        const u = JSON.parse(stored);
        const guestEmail = u.email;
        if (guestEmail) {
          setEmail(guestEmail);
          setName(u.name || "");
        }
      }
      setCheckingAccess(false);
    }
  }, [contest, isFree, hasPaid, checkingAccess]);

  const handleVote = async (contestantId: string) => {
    try {
      const res = await voteMutation.mutateAsync(contestantId);
      toast({ title: `Voted! Total votes: ${res.votes || 1}` });
    } catch (e: any) {
      toast({ title: e?.message || "Failed to vote", variant: "destructive" });
    }
  };

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const res = await purchaseInitiate.mutateAsync({ id, data: { name, email, phone } });
      setOrderId(res.orderId);
      setShowPayment(true);
    } catch (e: any) {
      toast({ title: e?.message || "Failed to initiate payment", variant: "destructive" });
    }
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setVerifying(true);
    try {
      const res = await purchaseVerify.mutateAsync({ id, data: { order_id: orderId, payment_id: paymentId, signature } });
      if (res.watchGranted) {
        setHasPaid(true);
        setShowPayment(false);
        toast({ title: "Payment successful! You can now watch the contest." });
      }
    } catch (e: any) {
      toast({ title: e?.message || "Payment verification failed", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;
  if (error || !contest) return <div className="text-center py-20 text-muted-foreground">Contest not found</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="relative w-full" style={{ aspectRatio: "16/9", maxHeight: "60vh" }}>
        {contest.thumbnail || contest.coverImage ? (
          <img src={getImageUrl(contest.thumbnail || contest.coverImage)} alt={contest.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><Trophy className="w-20 h-20 text-zinc-700" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <h1 className="text-3xl md:text-5xl font-black text-foreground mb-2">{contest.title}</h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl line-clamp-2">{contest.shortDescription || contest.description}</p>
          <div className="flex items-center gap-3 mt-4">
            {isFree || hasAccess || hasPaid ? (
              <Button onClick={() => setLocation(`/watch/contest/${id}`)} className="bg-red-600 hover:bg-red-700 text-white">
                <Play className="w-4 h-4 mr-2" /> Watch Now
              </Button>
            ) : (
              <Button onClick={() => setShowPayment(true)} className="bg-red-600 hover:bg-red-700 text-white">
                <Lock className="w-4 h-4 mr-2" /> Buy Entry ₹{contest.price}
              </Button>
            )}
            <Button variant="outline" onClick={() => setLocation("/contests")}>Back to Contests</Button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 lg:px-12 py-10 space-y-10">
        {/* Contestants */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-foreground">Contestants ({contestants.length})</h2>
          </div>
          {contestants.length === 0 ? (
            <p className="text-muted-foreground text-sm">No contestants yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {contestants.map((c: any) => (
                <div key={c.id} className="bg-card border border-border rounded-xl p-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-2 overflow-hidden">
                    {c.photo ? <img src={getImageUrl(c.photo)} alt={c.name} className="w-full h-full object-cover" /> : <UserPlus className="w-8 h-8 text-muted-foreground mx-auto mt-4" />}
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                  {c.intro && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.intro}</p>}
                  <div className="flex items-center justify-center gap-1 mt-2 text-red-500">
                    <Vote className="w-4 h-4" />
                    <span className="text-sm font-bold">{c.votes || 0}</span>
                  </div>
                  <Button size="sm" className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => handleVote(c.id)} disabled={voteMutation.isPending}>
                    Vote
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Contest</DialogTitle>
          </DialogHeader>
          {!orderId ? (
            <form onSubmit={handleInitiatePayment} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={purchaseInitiate.isPending} className="bg-red-600 hover:bg-red-700 text-white">
                  {purchaseInitiate.isPending ? "Processing..." : `Pay ₹${contest.price}`}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleVerifyPayment} className="space-y-4">
              <div className="space-y-2">
                <Label>Razorpay Order ID</Label>
                <Input value={orderId} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Payment ID *</Label>
                <Input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Signature *</Label>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} required />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={verifying} className="bg-red-600 hover:bg-red-700 text-white">
                  {verifying ? "Verifying..." : "Verify Payment"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

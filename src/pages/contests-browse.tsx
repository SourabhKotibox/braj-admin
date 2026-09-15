import { useState } from "react";
import { useLocation } from "wouter";
import { Play, Vote, Trophy, Lock, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/api-client";
import { useGetPublicContests, useInitiateContestPurchase, useVerifyContestPurchase } from "@/lib/api-client";

export default function ContestsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedContest, setSelectedContest] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orderId, setOrderId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [signature, setSignature] = useState("");

  const { data, isLoading } = useGetPublicContests({ search, limit: 50 });
  const purchaseInitiate = useInitiateContestPurchase();
  const purchaseVerify = useVerifyContestPurchase();

  let contests = data?.data || [];
  if (filter === "featured") contests = contests.filter((c: any) => c.featured);
  else if (filter === "trending") contests = contests.filter((c: any) => c.trending);
  else if (filter === "free") contests = contests.filter((c: any) => !c.price || c.price <= 0);
  else if (filter === "paid") contests = contests.filter((c: any) => c.price > 0);

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContest?.id) return;
    try {
      const res = await purchaseInitiate.mutateAsync({ id: selectedContest.id, data: { name, email, phone } });
      setOrderId(res.orderId);
      setShowPayment(true);
    } catch (e: any) {
      toast({ title: e?.message || "Failed to initiate payment", variant: "destructive" });
    }
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContest?.id) return;
    try {
      const res = await purchaseVerify.mutateAsync({ id: selectedContest.id, data: { order_id: orderId, payment_id: paymentId, signature } });
      if (res.watchGranted) {
        setHasPaid(true);
        setShowPayment(false);
        toast({ title: "Payment successful! You can now watch the contest." });
      }
    } catch (e: any) {
      toast({ title: e?.message || "Payment verification failed", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="px-4 sm:px-8 lg:px-12 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-foreground">Contests</h1>
            <p className="text-muted-foreground text-sm mt-1">Participate, vote, and win exciting prizes</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contests</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="trending">Trending</SelectItem>
              <SelectItem value="free">Free Entry</SelectItem>
              <SelectItem value="paid">Paid Entry</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
        ) : contests.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No contests available</h3>
            <p className="text-muted-foreground text-sm mt-1">Check back later for new contests</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {contests.map((contest: any) => (
              <div key={contest.id} className="bg-card border border-border rounded-xl overflow-hidden group cursor-pointer" onClick={() => { setSelectedContest(contest); setHasPaid(false); }}>
                <div className="relative aspect-video bg-zinc-900">
                  {contest.thumbnail || contest.coverImage ? (
                    <img src={getImageUrl(contest.thumbnail || contest.coverImage)} alt={contest.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Trophy className="w-12 h-12 text-zinc-700" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  {contest.featured && <Badge className="absolute top-2 left-2 bg-red-600 text-white border-0">FEATURED</Badge>}
                  {contest.trending && <Badge className="absolute top-2 left-2 bg-orange-500 text-white border-0">TRENDING</Badge>}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-foreground font-bold text-sm truncate">{contest.title}</p>
                    <p className="text-foreground/80 text-xs">{contest.price > 0 ? `Entry: ₹${contest.price}` : "Free Entry"}</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground line-clamp-2">{contest.shortDescription || contest.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {contest.totalParticipants || 0} participants</span>
                    <span className="flex items-center gap-1"><Vote className="w-3 h-3" /> {contest.totalVotes || 0} votes</span>
                  </div>
                  <Button className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white" size="sm">
                    {(!contest.price || contest.price <= 0) ? "Join Free" : "Buy Entry"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contest Detail Dialog */}
      <Dialog open={!!selectedContest} onOpenChange={(open) => { if (!open) { setSelectedContest(null); setShowPayment(false); setHasPaid(false); } }}>
        <DialogContent className="bg-card border-border sm:max-w-2xl">
          {selectedContest && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedContest.title}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="details" className="mt-4">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="contestants">Contestants</TabsTrigger>
                  {selectedContest.price > 0 && <TabsTrigger value="payment">Payment</TabsTrigger>}
                </TabsList>
                <TabsContent value="details" className="space-y-4">
                  <p className="text-sm text-muted-foreground">{selectedContest.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1"><Trophy className="w-4 h-4" /> {selectedContest.totalParticipants || 0} participants</span>
                    <span className="flex items-center gap-1"><Vote className="w-4 h-4" /> {selectedContest.totalVotes || 0} votes</span>
                  </div>
                </TabsContent>
                <TabsContent value="contestants" className="space-y-3">
                  {selectedContest.contestants?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No contestants yet.</p>
                  ) : (
                    selectedContest.contestants?.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{c.name}</p>
                          {c.intro && <p className="text-xs text-muted-foreground">{c.intro}</p>}
                        </div>
                        <div className="flex items-center gap-1 text-red-500">
                          <Vote className="w-4 h-4" />
                          <span className="text-sm font-bold">{c.votes || 0}</span>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
                {selectedContest.price > 0 && (
                  <TabsContent value="payment" className="space-y-4">
                    {hasPaid ? (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" /> Payment successful. You can now watch the contest.
                      </div>
                    ) : showPayment && !orderId ? (
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
                        <Button type="submit" disabled={purchaseInitiate.isPending} className="w-full bg-red-600 hover:bg-red-700 text-white">
                          {purchaseInitiate.isPending ? "Processing..." : `Pay ₹${selectedContest.price}`}
                        </Button>
                      </form>
                    ) : orderId ? (
                      <form onSubmit={handleVerifyPayment} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Payment ID *</Label>
                          <Input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Signature *</Label>
                          <Input value={signature} onChange={(e) => setSignature(e.target.value)} required />
                        </div>
                        <Button type="submit" disabled={verifying} className="w-full bg-red-600 hover:bg-red-700 text-white">
                          {verifying ? "Verifying..." : "Verify Payment"}
                        </Button>
                      </form>
                    ) : (
                      <Button onClick={() => setShowPayment(true)} className="w-full bg-red-600 hover:bg-red-700 text-white">
                        <Lock className="w-4 h-4 mr-2" /> Buy Entry ₹{selectedContest.price}
                      </Button>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

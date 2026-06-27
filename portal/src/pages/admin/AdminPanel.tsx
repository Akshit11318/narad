import { useState, useEffect, useCallback } from "react";
import { Layout } from "../../components/layout";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api";

interface Election {
  id: string;
  publicKey: string;
  data: {
    stage: string;
    initiator: string;
    totalVotes: string;
    totalCandidates: string;
    candidateWhitelist: string[];
  };
}

interface Voter {
  id: number;
  voterId: string;
  email: string;
  electionId: string;
  ci: string | null;
  auxi: string | null;
}

interface ServiceHealth {
  name: string;
  status: string;
}

type Tab = "overview" | "elections" | "voters" | "candidates" | "results" | "wallet" | "settings";

const inputClass = "mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
const cardClass = "bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl p-6";
const btnPrimary = "px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/20";
const btnSecondary = "px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-all border border-gray-700";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [elections, setElections] = useState<Election[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>([]);
  const [walletInfo, setWalletInfo] = useState<{ publicKey: string; balance: string } | null>(null);

  const [totalVotes, setTotalVotes] = useState(3);
  const [totalCandidates, setTotalCandidates] = useState(4);
  const [voterEmail, setVoterEmail] = useState("");
  const [voterId, setVoterId] = useState("");
  const [voterElectionId, setVoterElectionId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidateElectionId, setCandidateElectionId] = useState("");
  const [resultsElectionId, setResultsElectionId] = useState("");
  const [resultsData, setResultsData] = useState<{ totalVotes: number; voteCounts: number[]; rawResult: string } | null>(null);
  const [storedResults, setStoredResults] = useState<any>(null);
  const [aggregating, setAggregating] = useState(false);

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const apiCall = useCallback(async (method: string, path: string, body?: any) => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Unknown error");
      throw err;
    }
  }, [showMessage]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [electionsRes, votersRes] = await Promise.all([
        fetch(`${API}/blockchain/elections`, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(`${API}/voter/list`, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } }).then(r => r.json()).catch(() => ({ data: [] })),
      ]);
      setElections(electionsRes.data || []);
      setVoters(votersRes.data || []);
    } catch { }
    setLoading(false);
  }, []);

  const checkHealth = useCallback(async () => {
    const services: ServiceHealth[] = [
      { name: "Backend API", status: "checking" },
      { name: "Portal", status: "checking" },
      { name: "Solana RPC", status: "checking" },
      { name: "Database", status: "checking" },
    ];

    const checks = await Promise.all([
      fetch("http://localhost:3000/health", { signal: AbortSignal.timeout(3000) }).then(() => true).catch(() => false),
      fetch(window.location.origin + "/health", { signal: AbortSignal.timeout(3000) }).then(() => true).catch(() => false),
      fetch("http://localhost:8899", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }), signal: AbortSignal.timeout(3000) }).then(() => true).catch(() => false),
      fetch(`${API}/aggregator/params`, { signal: AbortSignal.timeout(3000) }).then(() => true).catch(() => false),
    ]);

    setServiceHealth(services.map((s, i) => ({ ...s, status: checks[i] ? "healthy" : "offline" })));
  }, []);

  const fetchWalletInfo = useCallback(async () => {
    try {
      const data = await apiCall("GET", "/blockchain/wallet-info");
      setWalletInfo({ publicKey: data.publicKey, balance: "..." });
      showMessage("success", `Wallet: ${data.publicKey.substring(0, 12)}...`);
    } catch { }
  }, [apiCall, showMessage]);

  useEffect(() => {
    fetchData();
    checkHealth();
    fetchWalletInfo();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchData, checkHealth, fetchWalletInfo]);

  const createElection = async () => {
    await apiCall("POST", "/blockchain/create-election", { totalVotes, totalCandidates });
    showMessage("success", "Election created on blockchain!");
    fetchData();
  };

  const changeStage = async (electionId: string, stage: string) => {
    await apiCall("POST", `/blockchain/elections/${electionId}/change-stage`, { stage });
    showMessage("success", `Stage changed to ${stage}`);
    fetchData();
  };

  const addVoter = async () => {
    if (!voterEmail || !voterId || !voterElectionId) { showMessage("error", "All fields required"); return; }
    await apiCall("POST", "/voter/add", { email: voterEmail, voterId, electionId: voterElectionId });
    showMessage("success", `Voter ${voterId} added!`);
    setVoterEmail(""); setVoterId("");
    fetchData();
  };

  const addCandidate = async () => {
    if (!candidateName || !candidateElectionId) { showMessage("error", "All fields required"); return; }
    await apiCall("POST", `/blockchain/elections/${candidateElectionId}/candidates`, { candidateName });
    showMessage("success", `Candidate ${candidateName} added!`);
    setCandidateName("");
    fetchData();
  };

  const fetchCryptoParams = async () => {
    try {
      const data = await apiCall("GET", "/aggregator/params");
      showMessage("success", "N: " + (data.N || "").substring(0, 20) + "... | H: " + (data.H || "").substring(0, 20) + "...");
    } catch { }
  };

  const removeCandidate = async (electionId: string, name: string) => {
    await apiCall("DELETE", `/blockchain/elections/${electionId}/candidates/${name}`);
    showMessage("success", `Candidate ${name} removed`);
    fetchData();
  };

  const computeAux = async () => {
    if (!resultsElectionId) { showMessage("error", "Select an election first"); return; }
    try {
      setAggregating(true);
      await apiCall("POST", "/aggregator/compute-aux/" + resultsElectionId);
      showMessage("success", "Aux product computed!");
    } catch { } finally { setAggregating(false); }
  };

  const aggregateVotes = async () => {
    if (!resultsElectionId) { showMessage("error", "Select an election first"); return; }
    try {
      setAggregating(true);
      showMessage("success", "Aggregating votes... this may take a moment");
      const data = await apiCall("POST", "/aggregator/aggregate/" + resultsElectionId);
      setResultsData(data.data);
      showMessage("success", "Votes aggregated! Total: " + data.data.totalVotes);
    } catch { } finally { setAggregating(false); }
  };

  const fetchStoredResults = async () => {
    if (!resultsElectionId) return;
    try {
      const data = await apiCall("GET", "/aggregator/results/" + resultsElectionId);
      setStoredResults(data.data);
    } catch {
      setStoredResults(null);
    }
  };

  useEffect(() => {
    if (resultsElectionId) fetchStoredResults();
  }, [resultsElectionId]);

  const stageColors: Record<string, string> = {
    application: "bg-blue-900 text-blue-400 border border-blue-500",
    voting: "bg-green-900 text-green-400 border border-green-500",
    closed: "bg-red-900 text-red-400 border border-red-500",
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { key: "elections", label: "Elections", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { key: "voters", label: "Voters", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
    { key: "candidates", label: "Candidates", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { key: "results", label: "Results", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { key: "wallet", label: "Wallet", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
    { key: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Admin Panel</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Operations & Monitoring</p>
        </div>

        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium border ${
            message.type === "success" ? "bg-green-900/50 text-green-400 border-green-500/50" : "bg-red-900/50 text-red-400 border-red-500/50"
          }`}>{message.text}</div>
        )}

        <div className="flex gap-1 mb-6 bg-gray-900/50 p-1 rounded-xl border border-gray-700/50 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.key ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-500 text-sm mb-4">Loading...</p>}

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {serviceHealth.map((svc) => (
                <div key={svc.name} className={cardClass}>
                  <p className="font-medium text-sm text-white">{svc.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${svc.status === "healthy" ? "bg-green-500 shadow-green-500/50 shadow-lg" : svc.status === "checking" ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`} />
                    <span className="text-sm text-gray-400 capitalize">{svc.status}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className={cardClass}>
                <h3 className="font-semibold text-white mb-2">Elections</h3>
                <p className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{elections.length}</p>
                <p className="text-sm text-gray-500 mt-1">on chain</p>
              </div>
              <div className={cardClass}>
                <h3 className="font-semibold text-white mb-2">Voters</h3>
                <p className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">{voters.length}</p>
                <p className="text-sm text-gray-500 mt-1">registered</p>
              </div>
            </div>
            <div className={cardClass}>
              <h3 className="font-semibold text-white mb-3">Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setActiveTab("elections")} className={btnPrimary}>+ Create Election</button>
                <button onClick={() => setActiveTab("voters")} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all">+ Add Voter</button>
                <button onClick={() => setActiveTab("candidates")} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-all">+ Add Candidate</button>
                <button onClick={fetchData} className={btnSecondary}>Refresh</button>
                <button onClick={checkHealth} className={btnSecondary}>Check Health</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "elections" && (
          <div className="space-y-6">
            <div className={cardClass}>
              <h2 className="text-lg font-semibold text-white mb-4">Create New Election</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-gray-400">Total Votes</label><input type="number" value={totalVotes} onChange={(e) => setTotalVotes(Number(e.target.value))} className={inputClass} /></div>
                <div><label className="text-sm font-medium text-gray-400">Total Candidates</label><input type="number" value={totalCandidates} onChange={(e) => setTotalCandidates(Number(e.target.value))} className={inputClass} /></div>
              </div>
              <button onClick={createElection} className={`mt-4 ${btnPrimary}`}>Create on Blockchain</button>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">All Elections</h2>
              {elections.length === 0 ? <div className={cardClass + " text-center"}><p className="text-gray-500 text-sm">No elections created yet.</p></div> : (
                <div className="space-y-3">
                  {elections.map((election) => (
                    <div key={election.id} className={cardClass}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-xs text-gray-500">{election.publicKey}</p>
                          <p className="text-sm text-gray-300 mt-1">Votes: {election.data.totalVotes} | Candidates: {election.data.totalCandidates}</p>
                          <p className="text-sm text-gray-400">Candidates: {election.data.candidateWhitelist?.join(", ") || "None"}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${stageColors[election.data.stage] || "bg-gray-800 text-gray-400"}`}>{election.data.stage}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => changeStage(election.id, "application")} className="px-3 py-1.5 bg-blue-900/50 text-blue-400 border border-blue-700 rounded-lg text-xs hover:bg-blue-800 transition-all">Application</button>
                        <button onClick={() => changeStage(election.id, "voting")} className="px-3 py-1.5 bg-green-900/50 text-green-400 border border-green-700 rounded-lg text-xs hover:bg-green-800 transition-all">Voting</button>
                        <button onClick={() => changeStage(election.id, "closed")} className="px-3 py-1.5 bg-red-900/50 text-red-400 border border-red-700 rounded-lg text-xs hover:bg-red-800 transition-all">Close</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "voters" && (
          <div className="space-y-6">
            <div className={cardClass}>
              <h2 className="text-lg font-semibold text-white mb-4">Add Voter</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-sm font-medium text-gray-400">Email</label><input type="email" value={voterEmail} onChange={(e) => setVoterEmail(e.target.value)} placeholder="voter@email.com" className={inputClass} /></div>
                <div><label className="text-sm font-medium text-gray-400">Voter ID (Key)</label><input type="text" value={voterId} onChange={(e) => setVoterId(e.target.value)} placeholder="voter1" className={inputClass} /></div>
                <div><label className="text-sm font-medium text-gray-400">Election ID</label><input type="text" value={voterElectionId} onChange={(e) => setVoterElectionId(e.target.value)} placeholder="election pubkey" className={inputClass} /></div>
              </div>
              <button onClick={addVoter} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all shadow-lg shadow-green-500/20">Add Voter</button>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Registered Voters</h2>
              {voters.length === 0 ? <div className={cardClass + " text-center"}><p className="text-gray-500 text-sm">No voters registered.</p></div> : (
                <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800/50"><tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-400">ID</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-400">Voter Key</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-400">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-400">Election</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-400">Voted</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-800">
                      {voters.map((voter) => (
                        <tr key={voter.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3 text-gray-400">{voter.id}</td>
                          <td className="px-4 py-3 font-mono text-xs text-blue-400">{voter.voterId}</td>
                          <td className="px-4 py-3 text-gray-300">{voter.email}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500 truncate max-w-[200px]">{voter.electionId}</td>
                          <td className="px-4 py-3">{voter.ci ? <span className="text-green-400">✓ Yes</span> : <span className="text-gray-600">No</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "candidates" && (
          <div className="space-y-6">
            <div className={cardClass}>
              <h2 className="text-lg font-semibold text-white mb-4">Add Candidate</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-gray-400">Candidate Name</label><input type="text" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="John Doe" className={inputClass} /></div>
                <div><label className="text-sm font-medium text-gray-400">Election ID</label><input type="text" value={candidateElectionId} onChange={(e) => setCandidateElectionId(e.target.value)} placeholder="election pubkey" className={inputClass} /></div>
              </div>
              <button onClick={addCandidate} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20">Add to Whitelist</button>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Candidates per Election</h2>
              {elections.length === 0 ? <div className={cardClass + " text-center"}><p className="text-gray-500 text-sm">No elections available.</p></div> : (
                elections.map((election) => (
                  <div key={election.id} className={cardClass + " mb-3"}>
                    <p className="font-mono text-xs text-gray-500 mb-3">{election.publicKey}</p>
                    {election.data.candidateWhitelist?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {election.data.candidateWhitelist.map((name) => (
                          <div key={name} className="flex items-center gap-2 bg-purple-900/30 border border-purple-700/50 px-3 py-1.5 rounded-lg">
                            <span className="text-sm text-purple-300">{name}</span>
                            <button onClick={() => removeCandidate(election.id, name)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-gray-600 text-sm">No candidates added</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "results" && (
          <div className="space-y-6">
            <div className={cardClass}>
              <h2 className="text-lg font-semibold text-white mb-4">Election Results</h2>
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-400">Select Election</label>
                <select
                  value={resultsElectionId}
                  onChange={(e) => { setResultsElectionId(e.target.value); setResultsData(null); setStoredResults(null); }}
                  className={inputClass}
                >
                  <option value="">Choose an election...</option>
                  {elections.map((el) => (
                    <option key={el.id} value={el.publicKey} className="bg-gray-800">
                      {el.publicKey.substring(0, 20)}... ({el.data.stage})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={computeAux} disabled={aggregating || !resultsElectionId}
                  className={"px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-all " + (aggregating ? "opacity-50 cursor-not-allowed" : "")}>
                  {aggregating ? "Computing..." : "1. Compute Aux Product"}
                </button>
                <button onClick={aggregateVotes} disabled={aggregating || !resultsElectionId}
                  className={"px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all " + (aggregating ? "opacity-50 cursor-not-allowed" : "")}>
                  {aggregating ? "Aggregating..." : "2. Aggregate & Decrypt Votes"}
                </button>
                <button onClick={fetchStoredResults} disabled={!resultsElectionId} className={btnSecondary}>
                  Refresh Results
                </button>
              </div>
            </div>

            {resultsData && (
              <div className={cardClass}>
                <h3 className="text-lg font-semibold text-white mb-4">Live Aggregation Results</h3>
                <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-400">Total Votes Cast: <span className="text-white font-bold text-lg">{resultsData.totalVotes}</span></p>
                </div>
                <div className="space-y-3">
                  {resultsData.voteCounts.map((count, idx) => {
                    const max = Math.max(...resultsData.voteCounts, 1);
                    const pct = Math.round((count / max) * 100);
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">Candidate {idx + 1}</span>
                          <span className="text-white font-bold">{count} votes</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                            style={{ width: pct + "%" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-2 bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-500 font-mono break-all">Raw: {resultsData.rawResult.substring(0, 60)}...</p>
                </div>
              </div>
            )}

            {storedResults && !resultsData && (
              <div className={cardClass}>
                <h3 className="text-lg font-semibold text-white mb-4">Stored Results</h3>
                {storedResults.decodedVotes && storedResults.decodedVotes.length > 0 ? (
                  <div className="space-y-3">
                    {storedResults.decodedVotes.map((rv: any, idx: number) => {
                      const votes = rv.votes || 0;
                      const allVotes = storedResults.decodedVotes.map((v: any) => v.votes || 0);
                      const max = Math.max(...allVotes, 1);
                      const pct = Math.round((votes / max) * 100);
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">{rv.candidate}</span>
                            <span className="text-white font-bold">{votes} votes</span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                            <div className="h-3 rounded-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500" style={{ width: pct + "%" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No decoded results yet. Run aggregation above.</p>
                )}
              </div>
            )}

            {!resultsElectionId && (
              <div className={cardClass + " text-center"}>
                <p className="text-gray-500 text-sm">Select an election to view and compute results.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="space-y-6">
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                <h2 className="text-lg font-semibold text-white">Solana Wallet</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Wallet Public Key</label>
                  <div className="mt-1 p-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-xs break-all text-blue-400">
                    {walletInfo?.publicKey || "Loading... (backend auto-generates on startup)"}
                  </div>
                </div>
                <div className="p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                  <p className="text-sm text-blue-300">The backend auto-generates a wallet on first startup and airdrops 100 SOL. The wallet persists in the container volume.</p>
                </div>
              </div>
            </div>
            <div className={cardClass}>
              <h3 className="font-semibold text-white mb-2">Solana RPC</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-400">Endpoint: <code className="bg-gray-800 px-2 py-0.5 rounded text-blue-400">http://localhost:8899</code></p>
                <p className="text-gray-400">Cluster: <code className="bg-gray-800 px-2 py-0.5 rounded text-green-400">localnet</code></p>
                <p className="text-gray-400">Program: <code className="bg-gray-800 px-2 py-0.5 rounded text-purple-400">RhzKgCXcLLN1pJKLHK2MDbP6n8ijLW5pNWTDpfvsDKM</code></p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className={cardClass}>
              <h2 className="text-lg font-semibold text-white mb-3">System Parameters</h2>
              <p className="text-sm text-gray-400 mb-4">Cryptographic parameters are auto-initialized on backend startup.</p>
              <button onClick={fetchCryptoParams} className={btnPrimary}>Fetch Crypto Params</button>
            </div>
            <div className={cardClass}>
              <h3 className="font-semibold text-white mb-2">Database</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-400">PostgreSQL: <span className="text-green-400 font-medium">narad-postgres:5432</span></p>
                <p className="text-gray-400">Database: <code className="bg-gray-800 px-2 py-0.5 rounded text-blue-400">voting</code></p>
                <p className="text-gray-400">Migrations: <code className="bg-gray-800 px-2 py-0.5 rounded text-blue-400">make db-migrate</code></p>
                <p className="text-gray-400">Reset: <code className="bg-gray-800 px-2 py-0.5 rounded text-red-400">make db-reset</code></p>
              </div>
            </div>
            <div className={cardClass}>
              <h3 className="font-semibold text-white mb-2">Docker Commands</h3>
              <div className="space-y-1 text-sm font-mono text-gray-400">
                <p>make docker       <span className="text-gray-600"># Start services</span></p>
                <p>make docker-full   <span className="text-gray-600"># Start with wallet</span></p>
                <p>make docker-down   <span className="text-gray-600"># Stop services</span></p>
                <p>make docker-logs   <span className="text-gray-600"># View logs</span></p>
                <p>make rebuild-all   <span className="text-gray-600"># Rebuild everything</span></p>
                <p>make status        <span className="text-gray-600"># Check status</span></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

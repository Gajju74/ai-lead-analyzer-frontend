"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";


type Lead = {
  id: number;
  name: string;
  company: string;
  phone: string;
  job_title: string;
  company_size: string;
  message: string;
  budget: string;
  budget_score: number;
  need_score: number;
  decision_maker_score: number;
  intent_score: number;
  lead_score: number;
  is_good_lead: boolean;
  service_needed: string;
  reason: string;
  next_action: string;
  status: string;
  notes: string;
  followup_message: string | null;
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  whatsapp_message_id: string | null;
  whatsapp_status: string | null;
  whatsapp_status_at: string | null;
};

type WhatsAppMessage = {
  id: number;
  lead_id: number | null;
  phone: string;
  contact_name: string | null;
  direction: "incoming" | "outgoing";
  message_type: string;
  message_text: string | null;
  message_timestamp: string | null;
  created_at: string;
};


export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLead, setExpandedLead] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("highest");

  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [statusText, setStatusText] = useState("");
  const [copiedLeadId, setCopiedLeadId] = useState<number | null>(null);
  // const [whatsappSent, setWhatsappSent] = useState(false);

  const [followUp, setFollowUp] = useState<{
    leadId: number;
    message: string;
  } | null>(null);

  const [preparingLead, setPreparingLead] = useState<number | null>(null);

  const [messagesByLead, setMessagesByLead] = useState<
    Record<number, WhatsAppMessage[]>
  >({});

  const [activeConversationLeadId, setActiveConversationLeadId] =
  useState<number | null>(null);

  const [replyDraft, setReplyDraft] = useState("");
  const [suggestingReply, setSuggestingReply] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [updatingAutoReply, setUpdatingAutoReply] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);


  const fetchAutoReplyStatus = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/whatsapp/auto-reply"
      );

      if (!response.ok) throw new Error("Failed to load auto-reply status");

      const data = await response.json();
      setAutoReplyEnabled(data.enabled);
    } catch (error) {
      console.error("Auto-reply status error:", error);
    }
  };

  const toggleAutoReply = async () => {
    setUpdatingAutoReply(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/whatsapp/auto-reply",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !autoReplyEnabled }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to update auto-reply");
      }

      setAutoReplyEnabled(data.enabled);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to update auto-reply"
      );
    } finally {
      setUpdatingAutoReply(false);
    }
  };
  
  const fetchLeadMessages = async (leadId: number) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/leads/${leadId}/messages`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data: WhatsAppMessage[] = await response.json();

      setMessagesByLead((current) => ({
        ...current,
        [leadId]: data,
      }));
    } catch (error) {
      console.error("Fetch WhatsApp messages error:", error);
    }
  };

  const suggestAIReply = async () => {
    if (activeConversationLeadId === null) return;

    const lead = leads.find(
      (item) => item.id === activeConversationLeadId
    );

    const incomingMessages = (
      messagesByLead[activeConversationLeadId] || []
    )
      .filter(
        (message) =>
          message.direction === "incoming" && message.message_text
      )
      .sort((a, b) => {
        const timeA = Number(a.message_timestamp || 0);
        const timeB = Number(b.message_timestamp || 0);
        return timeB - timeA;
      });

    const latestMessage = incomingMessages[0]?.message_text;

    if (!latestMessage) {
      alert("No incoming customer message found.");
      return;
    }

    setSuggestingReply(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/leads/${activeConversationLeadId}/suggest-reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: latestMessage }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.suggested_reply) {
        throw new Error(
          data.detail || data.error || "Failed to generate AI reply."
        );
      }

      setReplyDraft(data.suggested_reply);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to generate AI reply."
      );
    } finally {
      setSuggestingReply(false);
    }
  };

  const sendConversationReply = async () => {
    if (activeConversationLeadId === null || !replyDraft.trim()) return;

    const lead = leads.find(
      (item) => item.id === activeConversationLeadId
    );

    if (!lead?.phone?.trim()) {
      alert("This lead does not have a phone number.");
      return;
    }

    setSendingReply(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/send-whatsapp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: lead.id,
            phone: lead.phone,
            message: replyDraft.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error || data.success === false) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "Failed to send WhatsApp reply."
        );
      }

      setReplyDraft("");
      await fetchLeadMessages(lead.id);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to send WhatsApp reply."
      );
    } finally {
      setSendingReply(false);
    }
  };

  const prepareForFollowUp = async (leadId: number) => {
  setPreparingLead(leadId);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/agent/prepare-follow-up",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lead_id: leadId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to prepare lead");
      }

      setLeads((currentLeads) =>
        currentLeads.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                followup_message: data.message,
                whatsapp_sent: data.whatsapp_sent || false,
                whatsapp_sent_at: data.lead?.whatsapp_sent_at || null,
                notes:
                  data.lead?.notes ||
                  "AI generated a WhatsApp follow-up message.",
              }
            : lead
        )
      );

    } catch (error) {
      console.error("Prepare follow-up error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to prepare follow-up"
      );
    } finally {
      setPreparingLead(null);
    }
  };

  const saveLead = async (leadId: number) => {
  setSaving(true);

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/leads/${leadId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: statusText,
          notes: noteText,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update lead");
    }

    const updated = await response.json();


    setLeads((currentLeads) =>
      currentLeads.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              status: updated.status,
              notes: updated.notes,
            }
          : lead
      )
    );

    alert("Lead updated successfully");
  } catch (error) {
    console.error(error);
    alert("Failed to update lead");
  } finally {
    setSaving(false);
  }
  };

  useEffect(() => {
      const loadLeads = () => {
        fetch("http://127.0.0.1:8000/leads")
          .then((res) => res.json())
          .then((data) => {
            setLeads(data);

            // Restore saved follow-up message
            const preparedLead = data.find(
              (lead: Lead) => lead.followup_message
            );

            if (preparedLead) {
              setFollowUp({
                leadId: preparedLead.id,
                message: preparedLead.followup_message,
              });
            }

            setLoading(false);
          })
          .catch((error) => {
            console.error(error);
            setLoading(false);
          });
      };

      fetchAutoReplyStatus();
      // Load immediately
      loadLeads();

      // Refresh every 3 seconds
      const interval = setInterval(() => {
        loadLeads();
      }, 3000);

      return () => clearInterval(interval);
    }, []);

  useEffect(() => {
    if (activeConversationLeadId === null) return;

    const refreshMessages = () => {
      fetchLeadMessages(activeConversationLeadId);
    };

    refreshMessages();

    const interval = setInterval(refreshMessages, 5000);

    return () => clearInterval(interval);
  }, [activeConversationLeadId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [
    activeConversationLeadId,
    messagesByLead,
  ]);


  const goodLeads = leads.filter((lead) => lead.is_good_lead);

  const averageScore =
    leads.length > 0
      ? Math.round(
          leads.reduce((sum, lead) => sum + lead.lead_score, 0) /
            leads.length
        )
      : 0;

  // Search + Filter + Sort
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Search
    if (search.trim()) {
      const query = search.toLowerCase();

      result = result.filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          lead.company.toLowerCase().includes(query)
      );
    }

    // Filter
    if (filter === "good") {
      result = result.filter((lead) => lead.is_good_lead);
    }

    if (filter === "low") {
      result = result.filter((lead) => !lead.is_good_lead);
    }

    // Sort
    if (sort === "highest") {
      result.sort((a, b) => b.lead_score - a.lead_score);
    }

    if (sort === "lowest") {
      result.sort((a, b) => a.lead_score - b.lead_score);
    }

    return result;
  }, [leads, search, filter, sort]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading leads...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="font-semibold text-slate-900">
              WhatsApp AI Auto-Reply
            </h2>
            <p className="text-sm text-slate-500">
              Automatically reply to incoming customer messages.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Status: {autoReplyEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>

          <button
            type="button"
            onClick={toggleAutoReply}
            disabled={updatingAutoReply}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition cursor-pointer disabled:opacity-50 ${
              autoReplyEnabled
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {updatingAutoReply
              ? "Updating..."
              : autoReplyEnabled
                ? "Turn Auto-Reply Off"
                : "Turn Auto-Reply On"}
          </button>
        </div>


        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-indigo-600 mb-2">
            AI LEAD ANALYZER
          </p>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Lead Dashboard
          </h1>

          <p className="text-slate-500 mt-2">
            Analyze, qualify and manage your sales leads.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Leads
            </p>

            <p className="text-3xl font-bold mt-2">
              {leads.length}
            </p>

            <p className="text-sm text-slate-400 mt-2">
              All analyzed leads
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Good Leads
            </p>

            <p className="text-3xl font-bold text-emerald-600 mt-2">
              {goodLeads.length}
            </p>

            <p className="text-sm text-slate-400 mt-2">
              Qualified opportunities
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Average Score
            </p>

            <p className="text-3xl font-bold text-indigo-600 mt-2">
              {averageScore}/100
            </p>

            <p className="text-sm text-slate-400 mt-2">
              Overall lead quality
            </p>
          </div>

        </div>

        {/* Leads Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200">

            <h2 className="text-lg font-semibold">
              Recent Leads
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              AI-analyzed sales opportunities
            </p>

            {/* Search + Filters */}
            <div className="flex flex-col md:flex-row gap-3 mt-5">

              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name or company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Leads</option>
                <option value="good">Good Leads</option>
                <option value="low">Low Priority</option>
              </select>

              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="highest">
                  Highest Score
                </option>

                <option value="lowest">
                  Lowest Score
                </option>
              </select>

            </div>

            {/* Result count */}
            <p className="text-xs text-slate-400 mt-4">
              Showing {filteredLeads.length} of {leads.length} leads
            </p>

          </div>

          {/* Lead List */}
          <div className="divide-y divide-slate-100">

            {filteredLeads.length === 0 ? (

              <div className="p-10 text-center">
                <p className="text-slate-500">
                  No leads found.
                </p>

                <p className="text-sm text-slate-400 mt-1">
                  Try changing your search or filter.
                </p>
              </div>

            ) : (

            filteredLeads.map((lead) => {
            const isExpanded = expandedLead === lead.id;

            return (
                <div
                key={lead.id}
                className="border-b border-slate-100 last:border-b-0"
                >
                {/* Compact Lead Row */}
                <button
                    onClick={() => {
                      if (!isExpanded) {
                        setStatusText(lead.status || "New");
                        setNoteText(lead.notes || "");
                      }

                      setExpandedLead(isExpanded ? null : lead.id);
                    }}
                    className="w-full px-6 py-5 text-left hover:bg-slate-50 transition"
                >
                    <div className="flex items-center gap-4">

                    {/* Name */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-900">
                            {lead.name}
                        </h3>

                        {lead.is_good_lead ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700">
                            Good Lead
                            </span>
                        ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                            Low Priority
                            </span>
                        )}
                        </div>

                        <p className="text-sm text-slate-500 mt-1">
                        {lead.company} · {lead.job_title}
                        </p>
                    </div>

                    {/* Service */}
                    <div className="hidden md:block w-64">
                        <p className="text-xs text-slate-400">
                        Service
                        </p>

                        <p className="text-sm font-medium text-slate-700 truncate">
                        {lead.service_needed}
                        </p>
                    </div>

                    {/* Budget */}
                    <div className="hidden lg:block w-28">
                        <p className="text-xs text-slate-400">
                        Budget
                        </p>

                        <p className="text-sm font-medium">
                        {lead.budget}
                        </p>
                    </div>

                    {/* Score */}
                    <div className="w-24 text-right">
                        <p className="text-xs text-slate-400">
                        SCORE
                        </p>

                        <p className="text-xl font-bold text-indigo-600">
                        {lead.lead_score}
                        <span className="text-xs text-slate-400">
                            /100
                        </span>
                        </p>
                    </div>

                    {/* Arrow */}
                    <div className="w-6 text-slate-400 text-xl">
                        {isExpanded ? "⌃" : "›"}
                    </div>

                    </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                    <div className="px-6 pb-6 bg-slate-50/70">

                    <div className="pt-5">

                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-4">
                        AI Analysis
                        </p>

                        {/* Scores */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">

                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className="text-xs text-slate-400">
                            Budget
                            </p>

                            <p className="text-lg font-semibold mt-1">
                            {lead.budget_score}/5
                            </p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className="text-xs text-slate-400">
                            Need
                            </p>

                            <p className="text-lg font-semibold mt-1">
                            {lead.need_score}/5
                            </p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className="text-xs text-slate-400">
                            Decision Maker
                            </p>

                            <p className="text-lg font-semibold mt-1">
                            {lead.decision_maker_score}/5
                            </p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className="text-xs text-slate-400">
                            Intent
                            </p>

                            <p className="text-lg font-semibold mt-1">
                            {lead.intent_score}/5
                            </p>
                        </div>

                        </div>

                        {/* Lead Info */}
                        <div className="grid md:grid-cols-2 gap-4">

                        <div className="bg-white border border-slate-200 rounded-xl p-5">

                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Lead Message
                            </p>

                            <p className="text-sm text-slate-700 mt-2">
                            {lead.message}
                            </p>

                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl p-5">

                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            AI Reason
                            </p>

                            <p className="text-sm text-slate-700 mt-2">
                            {lead.reason}
                            </p>

                        </div>

                        </div>

                        {/* Next Action + Phone */}
                        <div className="mt-4">

                          <div className="flex items-start justify-between gap-4">

                            {/* Next Action */}
                            <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                                Recommended Next Action
                              </p>

                              <p className="text-sm font-medium text-slate-800 mt-2">
                                {lead.next_action}
                              </p>
                            </div>

                            {/* Phone Number */}
                            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-5">

                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Phone Number
                            </p>

                            <p className="text-sm text-slate-700 mt-2">
                            {lead.phone || "No phone number"}
                            </p>

                            </div>


                          </div>

                        </div>

                    </div>
                    {/* Lead Management */}

                    <div className="mt-5 grid md:grid-cols-2 gap-4">

                      {/* Status */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5">

                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Lead Status
                        </label>

                        <select
                          value={statusText}
                          onChange={(e) => setStatusText(e.target.value)}
                          className="w-full mt-3 px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Qualified">Qualified</option>
                          <option value="Converted">Converted</option>
                          <option value="Lost">Lost</option>
                        </select>

                      </div>

                      {/* Notes */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5">

                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Notes
                        </label>

                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add notes about this lead..."
                          rows={3}
                          className="w-full mt-3 px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none resize-none focus:ring-2 focus:ring-indigo-500"
                        />

                      </div>

                    </div>


                     <div className="flex items-start justify-between p-4 gap-4">

                    {/* Save Button */}
                    <div className="mt-4 flex justify-end">

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveLead(lead.id);
                        }}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>

                    </div>

                    <div className="mt-4 flex justify-end">

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          prepareForFollowUp(lead.id);
                        }}
                        disabled={
                          preparingLead === lead.id ||
                          !!lead.followup_message
                        }
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 hover:cursor-pointer disabled:opacity-50 transition"
                      >
                       {preparingLead === lead.id
                        ? "Preparing..."
                        : lead.followup_message
                          ? "✓ Follow-up Prepared"
                          : "Prepare for Follow-up"
                        }
                      </button>

                     </div>
                    </div>

                     {lead.followup_message && (
                      <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-5">

                        <div className="flex items-center justify-between mb-3">

                          {/* Title */}
                          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                            AI Follow-up Message
                          </p>
                          

                          {/* Copy Message */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();

                              await navigator.clipboard.writeText(
                                lead.followup_message || ""
                              );

                              setCopiedLeadId(lead.id);

                              setTimeout(() => {
                                setCopiedLeadId(null);
                              }, 2000);
                            }}
                              className="text-sm font-medium text-indigo-600 cursor-pointer hover:text-indigo-800 transition"
                            >
                              {copiedLeadId === lead.id
                                ? "✓ Copied!"
                                : "Copy Message"
                              }
                          </button>

                           {lead.whatsapp_status && (
                          <div className="text-xs text-slate-500">
                            WhatsApp Status:{" "}
                            <span className="font-semibold text-slate-700">
                              {lead.whatsapp_status === "sent" && "✓ Sent"}
                              {lead.whatsapp_status === "delivered" && "✓✓ Delivered"}
                              {lead.whatsapp_status === "read" && "✓✓ Read"}
                              {lead.whatsapp_status === "failed" && "✕ Failed"}
                            </span>
                          </div>
                        )}
                        
                        <button
                          onClick={() => setActiveConversationLeadId(lead.id)}
                          className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
                        >
                          <Icon icon="mdi:message-text-outline" width={18} />
                          WhatsApp Conversation
                          <span className="ml-2">
                            ({(messagesByLead[lead.id] || []).length})
                          </span>
                        </button>

                          {/* Send WhatsApp */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();

                              if (!lead.phone || !lead.phone.trim()) {
                                alert(
                                  "This lead does not have a phone number. Cannot send WhatsApp message."
                                );
                                return;
                              }

                              try {
                                const response = await fetch(
                                  "http://127.0.0.1:8000/send-whatsapp",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      lead_id: lead.id,
                                      phone: lead.phone,
                                      message: lead.followup_message,
                                    }),
                                  }
                                );

                                const data = await response.json();

                                if (!response.ok || data.error) {
                                  const errorMessage =
                                    typeof data.error === "string"
                                      ? data.error
                                      : data.error?.message
                                        ? data.error.message
                                        : JSON.stringify(data.error);

                                  throw new Error(
                                    errorMessage || "WhatsApp message failed to send."
                                  );
                                }

                                // Update only this lead
                                setLeads((currentLeads) =>
                                  currentLeads.map((currentLead) =>
                                    currentLead.id === lead.id
                                      ? {
                                          ...currentLead,
                                          whatsapp_sent: true,
                                          whatsapp_sent_at:
                                            data.whatsapp_sent_at ||
                                            new Date().toISOString(),
                                          status: "Contacted",
                                          notes:
                                            "WhatsApp follow-up message sent successfully.",
                                        }
                                      : currentLead
                                  )
                                );

                              } catch (error) {
                                console.error("WhatsApp send error:", error);

                                alert(
                                  error instanceof Error
                                    ? error.message
                                    : "WhatsApp message failed to send."
                                );
                              }
                            }}
                            className="text-sm font-medium cursor-pointer text-green-600 hover:text-green-800 transition"
                          >
                            {lead.whatsapp_sent
                              ? "✓ Already Sent — Send Again"
                              : "Send WhatsApp"}
                          </button>

                        </div>

                        {/* Message */}
                        <p className="mt-2 text-sm text-slate-700 leading-6">
                          {lead.followup_message}
                        </p>

                      </div>
                    )}

                    
                    </div>
                    
                    
                )}
                </div>
            );
            })

            )}

          </div>

        </div>

      </div>
            
      {activeConversationLeadId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setActiveConversationLeadId(null)}
        >
          <div
            className="flex h-[min(680px,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[#efeae2] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-[#075e54] px-4 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Icon icon="mdi:account-outline" width={24} />
                </div>

                <div>
                  <h3 className="font-semibold">
                    {leads.find(
                      (item) => item.id === activeConversationLeadId
                    )?.name || "WhatsApp Contact"}
                  </h3>
                  <p className="text-xs text-white/75">
                    WhatsApp conversation
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveConversationLeadId(null)}
                className="rounded-full p-2 hover:bg-white/10"
                aria-label="Close conversation"
              >
                <Icon icon="mdi:account-outline" width={24} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-[#efeae2] px-4 py-5">
              {(messagesByLead[activeConversationLeadId] || []).length === 0 ? (
                <p className="rounded-lg bg-white/80 p-4 text-center text-sm text-slate-600">
                  No conversation messages yet.
                </p>
              ) : (
                (messagesByLead[activeConversationLeadId] || [])
                  .slice()
                  .sort((a, b) => {
                    const timeA = a.message_timestamp
                      ? Number(a.message_timestamp)
                      : new Date(a.created_at).getTime() / 1000;

                    const timeB = b.message_timestamp
                      ? Number(b.message_timestamp)
                      : new Date(b.created_at).getTime() / 1000;

                    return timeA - timeB;
                  })
                  .map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.direction === "incoming"
                          ? "justify-start"
                          : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 shadow-sm ${
                          message.direction === "incoming"
                            ? "rounded-tl-sm bg-white text-slate-800"
                            : "rounded-tr-sm bg-[#d9fdd3] text-slate-800"
                        }`}
                      >
                        <p className="mb-1 text-[11px] font-semibold text-slate-500">
                          {message.direction === "incoming"
                            ? message.contact_name || "Customer"
                            : "You"}
                        </p>

                        <p className="whitespace-pre-wrap break-words text-sm">
                          {message.message_text ||
                            `[${message.message_type} message]`}
                        </p>

                        <p className="mt-1 text-right text-[10px] text-slate-500">
                          {message.message_timestamp
                            ? new Date(
                                Number(message.message_timestamp) * 1000
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : new Date(message.created_at).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                        </p>
                      </div>
                    </div>
                  ))
              )}

              <div ref={chatEndRef} />
            </div>


            {/* Footer: AI reply and WhatsApp send */}
            <div className="border-t border-slate-200 bg-white p-4">
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder="Type your reply or generate one with AI..."
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={suggestAIReply}
                  disabled={suggestingReply || sendingReply}
                  className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                >
                  <Icon icon="mdi:robot-outline" width={18} />
                  {suggestingReply ? "Generating..." : "AI Suggest Reply"}
                </button>

                <button
                  onClick={sendConversationReply}
                  disabled={sendingReply || suggestingReply || !replyDraft.trim()}
                  className="flex items-center gap-2 rounded-lg bg-[#075e54] px-4 py-2 text-sm font-semibold text-white hover:bg-[#064e46] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon icon="mdi:send" width={18} />
                  {sendingReply ? "Sending..." : "Send Reply"}
                </button>
              </div>

              <p className="mt-3 text-center text-xs text-slate-500">
                Messages refresh automatically every 5 seconds.
              </p>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
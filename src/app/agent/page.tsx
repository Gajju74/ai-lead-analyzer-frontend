"use client";

import { useState } from "react";

export default function AgentPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("http://127.0.0.1:8000/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await res.json();

      setResponse(data.response);
      setMessage("");

    } catch (error) {
      console.error(error);
      setResponse("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <p className="text-sm font-medium text-indigo-600">
            AI LEAD ANALYZER
          </p>

          <h1 className="text-3xl font-bold text-slate-900 mt-2">
            AI Sales Agent
          </h1>

          <p className="text-slate-500 mt-2">
            Ask the agent about your leads or let it manage them.
          </p>
        </div>

        {/* Chat */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">

          <div className="min-h-[300px] bg-slate-50 rounded-xl p-5 mb-5">

            {response ? (
              <div>
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
                  AI Agent
                </p>

                <p className="text-slate-700 whitespace-pre-wrap leading-7">
                  {response}
                </p>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                Ask your AI agent something...
              </div>
            )}

          </div>

          <div className="flex gap-3">

            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Ask: Which lead should I contact first?"
              className="flex-1 px-4 py-3 text-slate-700 placeholder:text-slate-400 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <button
              onClick={sendMessage}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Thinking..." : "Send"}
            </button>

          </div>

        </div>

        {/* Suggestions */}
        <div className="grid md:grid-cols-3 gap-3 mt-5">

          <button
            onClick={() =>
              setMessage("Which leads should I contact first?")
            }
            className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-indigo-300"
          >
            <p className="font-medium">Prioritize leads</p>
            <p className="text-sm text-slate-500 mt-1">
              Find my best opportunities
            </p>
          </button>

          <button
            onClick={() =>
              setMessage("Show me all leads")
            }
            className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-indigo-300"
          >
            <p className="font-medium">View leads</p>
            <p className="text-sm text-slate-500 mt-1">
              Get all saved leads
            </p>
          </button>

          <button
            onClick={() =>
              setMessage("Get lead 1")
            }
            className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-indigo-300"
          >
            <p className="font-medium">Lead details</p>
            <p className="text-sm text-slate-500 mt-1">
              Inspect a specific lead
            </p>
          </button>

        </div>

      </div>
    </main>
  );
}
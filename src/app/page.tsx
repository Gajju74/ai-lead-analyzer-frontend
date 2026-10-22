"use client";

import { useState } from "react";

export default function Home() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    job_title: "",
    company_size: "",
    message: "",
    budget: "",
  });

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const analyzeLead = async () => {
    setLoading(true);

    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await response.json();

    setResult(data);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <div className="max-w-2xl mx-auto">

        <h1 className="text-4xl font-bold mb-2">
          AI Lead Analyzer
        </h1>

        <p className="text-gray-400 mb-8">
          Analyze your sales leads using local AI.
        </p>

        <div className="space-y-4">

          {[
            ["name", "Name"],
            ["company", "Company"],
            ["phone", "Phone Number"],
            ["job_title", "Job Title"],
            ["company_size", "Company Size"],
            ["budget", "Budget"],
          ].map(([name, label]) => (
            <input
              key={name}
              name={name}
              placeholder={label}
              value={form[name as keyof typeof form]}
              onChange={handleChange}
              className="w-full rounded-lg bg-gray-900 border border-gray-700 p-3"
            />
          ))}

          <textarea
            name="message"
            placeholder="What does the lead need?"
            value={form.message}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-lg bg-gray-900 border border-gray-700 p-3"
          />

          <button
            onClick={analyzeLead}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 cursor-pointer font-semibold hover:bg-blue-500"
          >
            {loading ? "Analyzing..." : "Analyze Lead"}
          </button>

        </div>

        {result && (
          <div className="mt-8 rounded-lg border border-gray-700 bg-gray-900 p-6">

            <h2 className="text-2xl font-bold mb-4">
              AI Analysis
            </h2>

            <div className="mb-5">
              <p className="text-3xl font-bold">
                {result.lead_score}/100
              </p>

              <p className="mt-1">
                Good Lead:{" "}
                <span className="font-semibold">
                  {result.is_good_lead ? "Yes" : "No"}
                </span>
              </p>
            </div>

            <p>Budget Score: {result.budget_score}/5</p>
            <p>Need Score: {result.need_score}/5</p>
            <p>
              Decision Maker Score:{" "}
              {result.decision_maker_score}/5
            </p>
            <p>Intent Score: {result.intent_score}/5</p>

            <p>Service: {result.service_needed}</p>
            <p>Budget: {result.budget}</p>

            <p className="mt-3">
              Reason: {result.reason}
            </p>

            <p className="mt-3">
              Next Action: {result.next_action}
            </p>

          </div>
        )}

      </div>
    </main>
  );
}
import { useState, useEffect, useCallback, useRef } from "react";

// ─── AI Engine (simulates Claude API integration) ───────────────────────────
const AIEngine = {
  scoreLead: (lead) => {
    let score = 0;
    const reasons = [];
    if (lead.email && !lead.email.includes("temp")) { score += 20; reasons.push("Valid email"); }
    if (lead.email?.match(/\.(com|org|io|co)$/)) { score += 10; reasons.push("Professional domain"); }
    if (lead.source === "organic") { score += 25; reasons.push("Organic traffic — high intent"); }
    else if (lead.source === "referral") { score += 20; reasons.push("Referral — trusted source"); }
    else if (lead.source === "social") { score += 15; reasons.push("Social media lead"); }
    else if (lead.source === "paid") { score += 10; reasons.push("Paid ad click"); }
    if (lead.pagesVisited > 5) { score += 15; reasons.push(`Visited ${lead.pagesVisited} pages`); }
    else if (lead.pagesVisited > 2) { score += 8; reasons.push(`Visited ${lead.pagesVisited} pages`); }
    if (lead.timeOnSite > 180) { score += 15; reasons.push("Long session (3+ min)"); }
    else if (lead.timeOnSite > 60) { score += 8; reasons.push("Moderate session time"); }
    if (lead.funnelStep >= 3) { score += 15; reasons.push(`Reached funnel step ${lead.funnelStep}`); }
    else if (lead.funnelStep >= 2) { score += 8; reasons.push("Progressed in funnel"); }
    const tier = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
    return { score: Math.min(score, 100), tier, reasons };
  },

  generateContent: (type, params) => {
    const templates = {
      landing_headline: [
        `${params.action || "Transform"} Your ${params.industry || "Business"} — ${params.benefit || "Results You Can Measure"}`,
        `Stop ${params.pain || "Wasting Time"}. Start ${params.benefit || "Growing Faster"} Today.`,
        `The #1 ${params.industry || "Business"} Solution Trusted by ${params.socialProof || "10,000+"} Teams`,
      ],
      email_subject: [
        `${params.firstName || "Hey"}, your ${params.resource || "free guide"} is ready`,
        `Quick question about your ${params.industry || "business"} goals`,
        `[Last chance] ${params.offer || "50% off"} expires tonight`,
      ],
      cta_button: [
        `Get My Free ${params.resource || "Guide"} →`,
        `Start ${params.action || "Growing"} Today`,
        `Yes, I Want ${params.benefit || "Better Results"}!`,
      ],
      email_body: [
        `Hi ${params.firstName || "there"},\n\nI noticed you checked out our ${params.page || "pricing page"} — that tells me you're serious about ${params.benefit || "growing your business"}.\n\nHere's the thing: most ${params.industry || "business"} owners spend weeks figuring this out alone. Our ${params.resource || "platform"} cuts that to days.\n\nWant to see how? Book a quick 15-min call:\n[Book Now]\n\nCheers,\n${params.senderName || "The Team"}`,
      ],
      funnel_copy: [
        `**Step 1 — The Hook:**\n"Are you tired of ${params.pain || "losing leads"}? You're not alone. ${params.stat || "73% of businesses"} face this exact problem."\n\n**Step 2 — Agitate:**\n"Every day without a solution costs you ${params.cost || "$500+"} in missed opportunities."\n\n**Step 3 — Solution:**\n"${params.product || "Our platform"} fixes this in ${params.timeframe || "under 7 days"} with zero learning curve."\n\n**Step 4 — CTA:**\n"${params.cta || "Start your free trial"} — no credit card required."`,
      ],
    };
    return templates[type] || ["Content type not supported"];
  },

  suggestAutomation: (trigger, context) => {
    const workflows = {
      new_lead: {
        name: "New Lead Nurture Sequence",
        steps: [
          { delay: "Immediate", action: "Send welcome email with lead magnet", channel: "Email" },
          { delay: "1 hour", action: "Score lead based on source & behavior", channel: "System" },
          { delay: "24 hours", action: "Send value-add content based on interest", channel: "Email" },
          { delay: "3 days", action: "Check engagement — if opened, send case study", channel: "Email" },
          { delay: "5 days", action: "If warm/hot → route to sales rep via CRM", channel: "CRM" },
          { delay: "7 days", action: "If cold → add to re-engagement drip", channel: "Email" },
        ],
      },
      cart_abandon: {
        name: "Cart Abandonment Recovery",
        steps: [
          { delay: "30 min", action: "Send reminder email with cart contents", channel: "Email" },
          { delay: "4 hours", action: "Send social proof (reviews, testimonials)", channel: "Email" },
          { delay: "24 hours", action: "Offer time-limited discount (10% off)", channel: "Email" },
          { delay: "48 hours", action: "Final urgency — 'Cart expires soon'", channel: "Email" },
          { delay: "72 hours", action: "If recovered → thank you + upsell", channel: "Email" },
        ],
      },
      high_intent: {
        name: "High-Intent Lead Fast Track",
        steps: [
          { delay: "Immediate", action: "AI scores lead & assigns priority tag", channel: "System" },
          { delay: "Immediate", action: "Notify sales team via Slack/CRM", channel: "CRM" },
          { delay: "5 min", action: "Send personalized video from founder", channel: "Email" },
          { delay: "1 hour", action: "If no reply → send calendar booking link", channel: "Email" },
          { delay: "24 hours", action: "Sales rep follows up with custom proposal", channel: "CRM" },
        ],
      },
      webinar_signup: {
        name: "Webinar Attendee Engagement",
        steps: [
          { delay: "Immediate", action: "Send confirmation + add to calendar", channel: "Email" },
          { delay: "24h before", action: "Reminder with preview content", channel: "Email" },
          { delay: "1h before", action: "Final reminder with join link", channel: "Email" },
          { delay: "After event", action: "Send replay + exclusive offer", channel: "Email" },
          { delay: "2 days after", action: "Score engagement & route to funnel", channel: "System" },
        ],
      },
    };
    return workflows[trigger] || workflows.new_lead;
  },
};

// ─── Sample Data ────────────────────────────────────────────────────────────
const SAMPLE_LEADS = [
  { id: 1, name: "Priya Sharma", email: "priya@techstartup.io", source: "organic", pagesVisited: 8, timeOnSite: 240, funnelStep: 3, date: "2026-04-25" },
  { id: 2, name: "James Okafor", email: "james.o@gmail.com", source: "referral", pagesVisited: 4, timeOnSite: 120, funnelStep: 2, date: "2026-04-24" },
  { id: 3, name: "Mei Lin Chen", email: "mchen@enterprise.com", source: "paid", pagesVisited: 2, timeOnSite: 45, funnelStep: 1, date: "2026-04-24" },
  { id: 4, name: "Alex Rivera", email: "alex@tempmail.xyz", source: "social", pagesVisited: 1, timeOnSite: 15, funnelStep: 1, date: "2026-04-23" },
  { id: 5, name: "Sarah Mitchell", email: "sarah.m@agency.co", source: "organic", pagesVisited: 12, timeOnSite: 420, funnelStep: 4, date: "2026-04-25" },
  { id: 6, name: "Raj Patel", email: "raj@boutiqueshop.com", source: "referral", pagesVisited: 6, timeOnSite: 200, funnelStep: 3, date: "2026-04-23" },
];

// ─── Subcomponents ──────────────────────────────────────────────────────────

function ScoreBadge({ tier, score }) {
  const colors = { hot: "#ef4444", warm: "#f59e0b", cold: "#6b7280" };
  const labels = { hot: "HOT", warm: "WARM", cold: "COLD" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: `${colors[tier]}18`, color: colors[tier],
      padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
      letterSpacing: "0.05em",
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[tier], boxShadow: `0 0 8px ${colors[tier]}60` }} />
      {labels[tier]} · {score}
    </span>
  );
}

function TypewriterText({ text, speed = 18 }) {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplay(""); setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      if (i < text.length) { setDisplay(text.slice(0, i + 1)); i++; }
      else { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return <span>{display}{!done && <span style={{ animation: "blink 1s step-end infinite", borderRight: "2px solid var(--accent)" }}>​</span>}</span>;
}

// ─── Main Application ───────────────────────────────────────────────────────

export default function KeaBuilderAISuite() {
  const [activeTab, setActiveTab] = useState("overview");
  const [leads, setLeads] = useState(() => SAMPLE_LEADS.map(l => ({ ...l, ...AIEngine.scoreLead(l) })));
  const [contentType, setContentType] = useState("landing_headline");
  const [contentParams, setContentParams] = useState({ industry: "SaaS", benefit: "2x Revenue", pain: "Losing Leads", action: "Scale", firstName: "Sarah", resource: "Growth Playbook", offer: "50% off" });
  const [generatedContent, setGeneratedContent] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState("new_lead");
  const [automationPreview, setAutomationPreview] = useState(null);
  const [animateSteps, setAnimateSteps] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setGeneratedContent([]);
    setTimeout(() => {
      const results = AIEngine.generateContent(contentType, contentParams);
      setGeneratedContent(results);
      setIsGenerating(false);
    }, 800);
  }, [contentType, contentParams]);

  const handleAutomationPreview = useCallback(() => {
    const wf = AIEngine.suggestAutomation(selectedTrigger);
    setAutomationPreview(wf);
    setAnimateSteps([]);
    wf.steps.forEach((_, i) => {
      setTimeout(() => setAnimateSteps(prev => [...prev, i]), 200 * (i + 1));
    });
  }, [selectedTrigger]);

  // ── Styles ──
  const accent = "#10b981";
  const accentDim = "#10b98130";
  const bg = "#0a0f1a";
  const surface = "#111827";
  const surfaceHover = "#1a2236";
  const border = "#1e293b";
  const textPrimary = "#e2e8f0";
  const textSecondary = "#94a3b8";

  const tabs = [
    { id: "overview", label: "Overview", icon: "◈" },
    { id: "leads", label: "AI Lead Scoring", icon: "◉" },
    { id: "content", label: "Content Generator", icon: "✦" },
    { id: "automation", label: "Smart Automation", icon: "⚡" },
  ];

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: bg, color: textPrimary, minHeight: "100vh",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes blink { 50% { opacity: 0 } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select, textarea { font-family: inherit; }
        ::-webkit-scrollbar { width: 6px } ::-webkit-scrollbar-track { background: ${bg} } ::-webkit-scrollbar-thumb { background: ${border}; border-radius: 3px }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${border}`, background: `${surface}cc`,
        backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${accent}, #06b6d4)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, color: "#fff",
          }}>K</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>KeaBuilder</div>
            <div style={{ fontSize: 11, color: textSecondary, letterSpacing: "0.08em", textTransform: "uppercase" }}>AI Suite</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400,
              background: activeTab === t.id ? accentDim : "transparent",
              color: activeTab === t.id ? accent : textSecondary,
              transition: "all 0.2s",
            }}>
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Content Area ── */}
      <main style={{ flex: 1, padding: "28px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div style={{ animation: "fadeUp 0.4s ease-out" }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.03em" }}>
              AI-Powered Growth Engine
            </h1>
            <p style={{ color: textSecondary, fontSize: 15, marginBottom: 32, maxWidth: 600, lineHeight: 1.6 }}>
              Three integrated AI modules designed for KeaBuilder — score leads intelligently, generate high-converting content, and automate your entire funnel workflow.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 36 }}>
              {[
                { icon: "◉", title: "AI Lead Scoring", desc: "Automatically score & prioritize every lead based on behavior, source, and funnel engagement. Route hot leads to sales instantly.", metric: `${leads.filter(l => l.tier === "hot").length} hot leads`, color: "#ef4444" },
                { icon: "✦", title: "Content Generator", desc: "Generate headlines, email sequences, CTAs, and funnel copy tuned for your industry and audience in seconds.", metric: "5 content types", color: "#8b5cf6" },
                { icon: "⚡", title: "Smart Automation", desc: "AI-suggested workflows that trigger based on lead behavior — from nurture sequences to cart recovery.", metric: "4 workflow templates", color: "#f59e0b" },
              ].map((card, i) => (
                <div key={i} onClick={() => setActiveTab(["leads", "content", "automation"][i])} style={{
                  background: surface, borderRadius: 16, padding: 28, border: `1px solid ${border}`,
                  cursor: "pointer", transition: "all 0.25s",
                  position: "relative", overflow: "hidden",
                }} onMouseEnter={e => { e.currentTarget.style.borderColor = card.color + "60"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                   onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = "none"; }}>
                  <div style={{ fontSize: 32, marginBottom: 16 }}>{card.icon}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{card.title}</h3>
                  <p style={{ fontSize: 13, color: textSecondary, lineHeight: 1.6, marginBottom: 16 }}>{card.desc}</p>
                  <div style={{ fontSize: 12, color: card.color, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{card.metric}</div>
                  <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: `radial-gradient(circle, ${card.color}08 0%, transparent 70%)` }} />
                </div>
              ))}
            </div>

            {/* Architecture Diagram */}
            <div style={{ background: surface, borderRadius: 16, padding: 28, border: `1px solid ${border}` }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>System Architecture</h3>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                {["Lead Capture\nForm / Funnel", "AI Scoring\nEngine", "CRM + Tags\nRouting", "Content\nGenerator", "Automation\nWorkflow", "Conversion\n& Analytics"].map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                    <div style={{
                      background: `${accent}12`, border: `1px solid ${accent}30`,
                      borderRadius: 12, padding: "14px 10px", textAlign: "center",
                      fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-line", flex: 1,
                      color: textPrimary, fontWeight: 500,
                    }}>{step}</div>
                    {i < 5 && <span style={{ color: accent, fontSize: 18, flexShrink: 0 }}>→</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LEAD SCORING TAB ── */}
        {activeTab === "leads" && (
          <div style={{ animation: "fadeUp 0.4s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <div>
                <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>AI Lead Scoring</h2>
                <p style={{ color: textSecondary, fontSize: 14, marginTop: 4 }}>Every lead is scored in real-time using behavioral signals from your KeaBuilder funnels.</p>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {["hot", "warm", "cold"].map(tier => (
                  <div key={tier} style={{
                    background: surface, borderRadius: 12, padding: "12px 20px",
                    border: `1px solid ${border}`, textAlign: "center",
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: tier === "hot" ? "#ef4444" : tier === "warm" ? "#f59e0b" : "#6b7280" }}>
                      {leads.filter(l => l.tier === tier).length}
                    </div>
                    <div style={{ fontSize: 11, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{tier}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {leads.sort((a, b) => b.score - a.score).map((lead, i) => (
                <div key={lead.id} onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                  style={{
                    background: surface, borderRadius: 14, padding: "18px 24px",
                    border: `1px solid ${selectedLead?.id === lead.id ? accent + "60" : border}`,
                    cursor: "pointer", transition: "all 0.2s",
                    animation: `slideIn 0.3s ease-out ${i * 0.06}s both`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = surfaceHover}
                  onMouseLeave={e => e.currentTarget.style.background = surface}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${accent}40, #06b6d450)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 600, color: "#fff",
                      }}>{lead.name.split(" ").map(n => n[0]).join("")}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{lead.name}</div>
                        <div style={{ fontSize: 12, color: textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>{lead.email}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ textAlign: "right", fontSize: 12, color: textSecondary }}>
                        <div>{lead.source} · {lead.pagesVisited} pages · Step {lead.funnelStep}</div>
                        <div style={{ marginTop: 2 }}>{Math.floor(lead.timeOnSite / 60)}m {lead.timeOnSite % 60}s on site</div>
                      </div>
                      <ScoreBadge tier={lead.tier} score={lead.score} />
                    </div>
                  </div>

                  {selectedLead?.id === lead.id && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${border}`, animation: "fadeUp 0.25s ease-out" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: accent, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Scoring Breakdown</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {lead.reasons.map((r, j) => (
                          <span key={j} style={{
                            fontSize: 12, padding: "4px 12px", borderRadius: 8,
                            background: `${accent}12`, color: accent, fontWeight: 500,
                          }}>✓ {r}</span>
                        ))}
                      </div>
                      <div style={{ marginTop: 14, fontSize: 13, color: textSecondary, lineHeight: 1.6 }}>
                        <strong style={{ color: textPrimary }}>AI Recommendation:</strong>{" "}
                        {lead.tier === "hot"
                          ? "Route immediately to sales. Send personalized outreach within 5 minutes for maximum conversion."
                          : lead.tier === "warm"
                          ? "Enroll in nurture sequence. Send a case study or value-add content within 24 hours."
                          : "Add to awareness drip campaign. Monitor for re-engagement signals."}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CONTENT GENERATOR TAB ── */}
        {activeTab === "content" && (
          <div style={{ animation: "fadeUp 0.4s ease-out" }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>AI Content Generator</h2>
            <p style={{ color: textSecondary, fontSize: 14, marginBottom: 28 }}>Generate optimized copy for every stage of your KeaBuilder funnel.</p>

            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24 }}>
              {/* Controls */}
              <div style={{ background: surface, borderRadius: 16, padding: 24, border: `1px solid ${border}` }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Content Type</label>
                <select value={contentType} onChange={e => setContentType(e.target.value)} style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${border}`,
                  background: bg, color: textPrimary, fontSize: 14, marginBottom: 20, cursor: "pointer", outline: "none",
                }}>
                  <option value="landing_headline">Landing Page Headlines</option>
                  <option value="email_subject">Email Subject Lines</option>
                  <option value="cta_button">CTA Buttons</option>
                  <option value="email_body">Full Email Body</option>
                  <option value="funnel_copy">Funnel Copy (PAS Framework)</option>
                </select>

                {[
                  { key: "industry", label: "Industry / Niche" },
                  { key: "benefit", label: "Key Benefit" },
                  { key: "pain", label: "Pain Point" },
                  { key: "firstName", label: "Lead First Name" },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: textSecondary, display: "block", marginBottom: 5 }}>{f.label}</label>
                    <input value={contentParams[f.key] || ""} onChange={e => setContentParams(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{
                        width: "100%", padding: "9px 14px", borderRadius: 10, border: `1px solid ${border}`,
                        background: bg, color: textPrimary, fontSize: 13, outline: "none",
                      }}
                      onFocus={e => e.target.style.borderColor = accent}
                      onBlur={e => e.target.style.borderColor = border}
                    />
                  </div>
                ))}

                <button onClick={handleGenerate} disabled={isGenerating} style={{
                  width: "100%", padding: "12px 20px", borderRadius: 12, border: "none",
                  background: isGenerating ? `${accent}60` : `linear-gradient(135deg, ${accent}, #06b6d4)`,
                  color: "#fff", fontSize: 14, fontWeight: 600, cursor: isGenerating ? "default" : "pointer",
                  transition: "all 0.2s", marginTop: 8,
                }}>
                  {isGenerating ? "Generating..." : "✦ Generate Content"}
                </button>
              </div>

              {/* Output */}
              <div style={{ background: surface, borderRadius: 16, padding: 24, border: `1px solid ${border}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Generated Output</div>

                {isGenerating && (
                  <div style={{
                    height: 60, borderRadius: 12, background: `linear-gradient(90deg, ${border}, ${surfaceHover}, ${border})`,
                    backgroundSize: "200% 100%", animation: "shimmer 1.5s linear infinite",
                  }} />
                )}

                {!isGenerating && generatedContent.length === 0 && (
                  <div style={{ color: textSecondary, fontSize: 14, textAlign: "center", padding: 60 }}>
                    Configure your parameters and click Generate to create AI-powered content.
                  </div>
                )}

                {!isGenerating && generatedContent.map((item, i) => (
                  <div key={i} style={{
                    background: bg, borderRadius: 12, padding: 20, marginBottom: 12,
                    border: `1px solid ${border}`, animation: `fadeUp 0.35s ease-out ${i * 0.12}s both`,
                    position: "relative",
                  }}>
                    <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                      VARIANT {i + 1}
                    </div>
                    <div style={{
                      fontSize: contentType === "email_body" || contentType === "funnel_copy" ? 13 : 16,
                      fontWeight: contentType === "email_body" || contentType === "funnel_copy" ? 400 : 600,
                      lineHeight: 1.7, whiteSpace: "pre-wrap",
                    }}>
                      <TypewriterText text={item} speed={contentType === "email_body" || contentType === "funnel_copy" ? 10 : 22} />
                    </div>
                    <button onClick={() => navigator.clipboard?.writeText(item)} style={{
                      position: "absolute", top: 12, right: 12, background: "transparent", border: "none",
                      color: textSecondary, cursor: "pointer", fontSize: 12, padding: "4px 8px", borderRadius: 6,
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = accent}
                    onMouseLeave={e => e.currentTarget.style.color = textSecondary}
                    >Copy</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── AUTOMATION TAB ── */}
        {activeTab === "automation" && (
          <div style={{ animation: "fadeUp 0.4s ease-out" }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>Smart Automation Builder</h2>
            <p style={{ color: textSecondary, fontSize: 14, marginBottom: 28 }}>AI-suggested workflows based on trigger events in your KeaBuilder funnels.</p>

            <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>
              {/* Trigger Selection */}
              <div style={{ background: surface, borderRadius: 16, padding: 24, border: `1px solid ${border}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Select Trigger</div>
                {[
                  { id: "new_lead", label: "New Lead Captured", icon: "👤", desc: "Funnel form submission" },
                  { id: "cart_abandon", label: "Cart Abandoned", icon: "🛒", desc: "Checkout not completed" },
                  { id: "high_intent", label: "High-Intent Signal", icon: "🔥", desc: "AI score ≥ 70" },
                  { id: "webinar_signup", label: "Webinar Signup", icon: "🎯", desc: "Event registration" },
                ].map(trigger => (
                  <button key={trigger.id} onClick={() => { setSelectedTrigger(trigger.id); setAutomationPreview(null); }} style={{
                    width: "100%", padding: "14px 16px", borderRadius: 12, border: `1px solid ${selectedTrigger === trigger.id ? accent + "60" : border}`,
                    background: selectedTrigger === trigger.id ? `${accent}12` : bg,
                    color: textPrimary, cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 12, marginBottom: 8,
                    transition: "all 0.2s",
                  }}>
                    <span style={{ fontSize: 22 }}>{trigger.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{trigger.label}</div>
                      <div style={{ fontSize: 11, color: textSecondary }}>{trigger.desc}</div>
                    </div>
                  </button>
                ))}

                <button onClick={handleAutomationPreview} style={{
                  width: "100%", padding: "12px 20px", borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${accent}, #06b6d4)`,
                  color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  marginTop: 12, transition: "all 0.2s",
                }}>
                  ⚡ Generate Workflow
                </button>
              </div>

              {/* Workflow Preview */}
              <div style={{ background: surface, borderRadius: 16, padding: 24, border: `1px solid ${border}` }}>
                {!automationPreview && (
                  <div style={{ color: textSecondary, fontSize: 14, textAlign: "center", padding: 80 }}>
                    Select a trigger event and click Generate Workflow to see AI-recommended automation steps.
                  </div>
                )}

                {automationPreview && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent, boxShadow: `0 0 12px ${accent}60` }} />
                      <h3 style={{ fontSize: 18, fontWeight: 600 }}>{automationPreview.name}</h3>
                    </div>

                    <div style={{ position: "relative", paddingLeft: 28 }}>
                      {/* Vertical line */}
                      <div style={{ position: "absolute", left: 11, top: 0, bottom: 0, width: 2, background: `${accent}30` }} />

                      {automationPreview.steps.map((step, i) => (
                        <div key={i} style={{
                          marginBottom: 20, position: "relative",
                          opacity: animateSteps.includes(i) ? 1 : 0,
                          transform: animateSteps.includes(i) ? "translateX(0)" : "translateX(-16px)",
                          transition: "all 0.35s ease-out",
                        }}>
                          {/* Node dot */}
                          <div style={{
                            position: "absolute", left: -22, top: 8, width: 12, height: 12,
                            borderRadius: "50%", background: accent, border: `3px solid ${surface}`,
                            boxShadow: `0 0 0 2px ${accent}40`,
                          }} />

                          <div style={{
                            background: bg, borderRadius: 12, padding: "14px 18px",
                            border: `1px solid ${border}`,
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: accent, fontFamily: "'JetBrains Mono', monospace" }}>{step.delay}</span>
                              <span style={{
                                fontSize: 10, padding: "2px 10px", borderRadius: 6,
                                background: step.channel === "Email" ? "#8b5cf620" : step.channel === "CRM" ? "#f59e0b20" : `${accent}15`,
                                color: step.channel === "Email" ? "#8b5cf6" : step.channel === "CRM" ? "#f59e0b" : accent,
                                fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                              }}>{step.channel}</span>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>{step.action}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{
        padding: "16px 28px", borderTop: `1px solid ${border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 12, color: textSecondary,
      }}>
        <span>KeaBuilder AI Suite · Built with Claude API</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>v1.0.0</span>
      </footer>
    </div>
  );
}

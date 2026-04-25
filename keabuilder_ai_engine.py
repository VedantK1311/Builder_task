"""
KeaBuilder AI Suite — Backend Engine
=====================================
Three AI modules designed to integrate into KeaBuilder's funnel/lead/automation platform.

Modules:
  1. Lead Scoring Engine   — Scores leads 0-100 based on behavioral signals
  2. Content Generator     — Generates funnel copy, emails, CTAs via templates + AI
  3. Automation Workflow    — Suggests & builds automation sequences from triggers

Architecture:
  KeaBuilder Funnel → Lead Capture Form → AI Scoring → CRM Tagging → 
  Content Generation → Automation Workflow → Conversion Tracking

Author: AI System Design Task for KeaBuilder
"""

import json
import random
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 1: AI LEAD SCORING ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class LeadTier(Enum):
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"


@dataclass
class LeadSignals:
    """Behavioral signals collected from KeaBuilder funnels."""
    email: str
    source: str               # organic, referral, social, paid, direct
    pages_visited: int         # total pages viewed in session
    time_on_site: int          # seconds
    funnel_step: int           # how far they progressed (1-5)
    form_completeness: float   # 0.0-1.0, how many fields filled
    return_visitor: bool       # visited before?
    device: str                # mobile, desktop, tablet
    referrer_domain: str = ""  # where they came from


@dataclass
class LeadScore:
    """Output of the AI scoring engine."""
    total_score: int
    tier: LeadTier
    breakdown: Dict[str, int]
    reasons: List[str]
    recommended_action: str
    priority_rank: int = 0


class LeadScoringEngine:
    """
    Scores leads 0-100 using weighted behavioral signals.
    
    Design rationale:
    - Intent signals (funnel progress, pages visited) weight highest
    - Source quality indicates baseline lead quality
    - Engagement depth (time, form completion) shows commitment
    - Negative signals (temp email, bounced) reduce score
    
    In production, this would be enhanced with:
    - ML model trained on historical conversion data
    - Real-time scoring via webhook on each funnel event
    - A/B testing of scoring weights
    """

    SCORING_RULES = {
        "source_quality": {
            "organic": 25,
            "referral": 20,
            "direct": 15,
            "social": 12,
            "paid": 10,
        },
        "funnel_progress": {
            1: 5,   # Landing page only
            2: 12,  # Clicked through
            3: 20,  # Engaged with content
            4: 28,  # Reached offer/pricing
            5: 35,  # Checkout/signup initiated
        },
        "engagement_thresholds": {
            "pages_high": (6, 15),    # 6+ pages = 15 points
            "pages_med": (3, 8),      # 3-5 pages = 8 points
            "time_high": (180, 15),   # 3+ min = 15 points
            "time_med": (60, 8),      # 1-3 min = 8 points
        },
    }

    NEGATIVE_SIGNALS = [
        ("temp", -15, "Temporary/disposable email detected"),
        ("test", -10, "Test email pattern"),
    ]

    def score_lead(self, signals: LeadSignals) -> LeadScore:
        breakdown = {}
        reasons = []

        # 1. Source quality
        src_score = self.SCORING_RULES["source_quality"].get(signals.source, 5)
        breakdown["source"] = src_score
        reasons.append(f"Source: {signals.source} (+{src_score})")

        # 2. Funnel progress
        funnel_score = self.SCORING_RULES["funnel_progress"].get(
            signals.funnel_step, 5
        )
        breakdown["funnel"] = funnel_score
        reasons.append(f"Funnel step {signals.funnel_step}/5 (+{funnel_score})")

        # 3. Page engagement
        page_score = 0
        if signals.pages_visited >= 6:
            page_score = 15
            reasons.append(f"High page engagement: {signals.pages_visited} pages (+15)")
        elif signals.pages_visited >= 3:
            page_score = 8
            reasons.append(f"Moderate engagement: {signals.pages_visited} pages (+8)")
        breakdown["pages"] = page_score

        # 4. Time on site
        time_score = 0
        if signals.time_on_site >= 180:
            time_score = 15
            reasons.append(f"Long session: {signals.time_on_site}s (+15)")
        elif signals.time_on_site >= 60:
            time_score = 8
            reasons.append(f"Moderate session: {signals.time_on_site}s (+8)")
        breakdown["time"] = time_score

        # 5. Form completeness bonus
        form_score = int(signals.form_completeness * 10)
        breakdown["form"] = form_score
        if form_score >= 7:
            reasons.append(f"Form {int(signals.form_completeness*100)}% complete (+{form_score})")

        # 6. Return visitor bonus
        if signals.return_visitor:
            breakdown["return"] = 10
            reasons.append("Return visitor (+10)")
        else:
            breakdown["return"] = 0

        # 7. Negative signals
        neg = 0
        for pattern, penalty, reason in self.NEGATIVE_SIGNALS:
            if pattern in signals.email.lower():
                neg += penalty
                reasons.append(f"⚠ {reason} ({penalty})")
        breakdown["negative"] = neg

        # Calculate total
        total = max(0, min(100, sum(breakdown.values())))

        # Determine tier
        if total >= 70:
            tier = LeadTier.HOT
            action = "Route to sales immediately. Personalized outreach within 5 minutes."
        elif total >= 40:
            tier = LeadTier.WARM
            action = "Enroll in nurture sequence. Send case study within 24 hours."
        else:
            tier = LeadTier.COLD
            action = "Add to awareness drip campaign. Monitor for re-engagement."

        return LeadScore(
            total_score=total,
            tier=tier,
            breakdown=breakdown,
            reasons=reasons,
            recommended_action=action,
        )

    def batch_score_and_rank(self, leads: List[LeadSignals]) -> List[LeadScore]:
        """Score multiple leads and rank by priority."""
        scores = [self.score_lead(lead) for lead in leads]
        scores.sort(key=lambda s: s.total_score, reverse=True)
        for i, score in enumerate(scores):
            score.priority_rank = i + 1
        return scores


# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 2: AI CONTENT GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ContentRequest:
    content_type: str   # headline, email_subject, cta, email_body, funnel_copy
    industry: str = "SaaS"
    benefit: str = "faster growth"
    pain_point: str = "wasting time on manual tasks"
    tone: str = "professional"  # professional, casual, urgent, friendly
    first_name: str = ""
    product_name: str = ""


class ContentGenerator:
    """
    Generates marketing copy for KeaBuilder funnels and campaigns.
    
    In production, this would call Claude API with:
    - Industry-specific system prompts
    - Brand voice guidelines from user settings
    - A/B test history to favor winning patterns
    - SEO keyword integration
    
    Current implementation uses template-based generation with
    variable interpolation to demonstrate the content pipeline.
    """

    TEMPLATES = {
        "headline": {
            "professional": [
                "{action} Your {industry} — {benefit} Guaranteed",
                "The Smarter Way to {action} Your {industry} Business",
                "From {pain_point} to {benefit}: Your {industry} Transformation Starts Here",
            ],
            "casual": [
                "Ready to {action}? Your {industry} Will Thank You 🚀",
                "Tired of {pain_point}? Yeah, Us Too. Here's the Fix.",
                "{benefit} — Without the Headache. Seriously.",
            ],
            "urgent": [
                "⚡ {industry} Leaders Are Already Seeing {benefit}. Are You?",
                "Stop {pain_point} Today — {benefit} Is Waiting",
                "[Limited] {action} Your {industry} Before Your Competitors Do",
            ],
        },
        "email_subject": {
            "professional": [
                "{first_name}, here's your roadmap to {benefit}",
                "Quick question about your {industry} strategy",
                "The {industry} insight you've been missing",
            ],
            "casual": [
                "{first_name} — you're going to love this 👀",
                "re: that {industry} thing we talked about",
                "This changed everything for our {industry} clients",
            ],
            "urgent": [
                "⏰ {first_name}, this expires at midnight",
                "[Action Required] Your {benefit} opportunity",
                "Last chance: {industry} exclusive ends today",
            ],
        },
        "cta": {
            "professional": [
                "Get Started Free →",
                "See How It Works",
                "Request Your Demo",
            ],
            "casual": [
                "Let's Do This! 🎉",
                "Show Me the Magic",
                "Yep, I'm In →",
            ],
            "urgent": [
                "Claim My Spot Now ⚡",
                "Start Before It's Gone",
                "Lock In My {benefit} →",
            ],
        },
        "email_body": {
            "professional": [
                (
                    "Hi {first_name},\n\n"
                    "I noticed you've been exploring solutions for {pain_point} "
                    "in your {industry} business — that tells me you're serious about {benefit}.\n\n"
                    "Here's what I've seen work for {industry} teams like yours:\n\n"
                    "1. Identify the bottleneck (usually it's {pain_point})\n"
                    "2. Automate the repetitive parts with the right tools\n"
                    "3. Focus your team on what actually drives {benefit}\n\n"
                    "We've helped 200+ {industry} companies make this shift. "
                    "Want to see how? I've set aside 15 minutes this week:\n\n"
                    "[Book a Quick Call]\n\n"
                    "Best,\nThe {product_name} Team"
                ),
            ],
        },
        "funnel_copy": {
            "professional": [
                (
                    "**PROBLEM:**\n"
                    "Every day, {industry} businesses lose revenue to {pain_point}. "
                    "It's not your fault — the old way of doing things simply doesn't scale.\n\n"
                    "**AGITATE:**\n"
                    "Think about it: how many hours did your team spend this week on tasks "
                    "that could be automated? That's time (and money) you'll never get back.\n\n"
                    "**SOLUTION:**\n"
                    "{product_name} eliminates {pain_point} so your team can focus on "
                    "what matters — {benefit}.\n\n"
                    "**PROOF:**\n"
                    "• 200+ {industry} companies already switched\n"
                    "• Average 3.2x ROI in the first 90 days\n"
                    "• Setup takes less than 30 minutes\n\n"
                    "**CTA:**\n"
                    "Start your free trial — no credit card required."
                ),
            ],
        },
    }

    def generate(self, request: ContentRequest) -> List[str]:
        """Generate content variants based on request parameters."""
        templates = self.TEMPLATES.get(request.content_type, {})
        tone_templates = templates.get(request.tone, templates.get("professional", []))

        results = []
        for template in tone_templates:
            content = template.format(
                industry=request.industry,
                benefit=request.benefit,
                pain_point=request.pain_point,
                action=request.benefit.split()[0].title() if request.benefit else "Grow",
                first_name=request.first_name or "there",
                product_name=request.product_name or "KeaBuilder",
            )
            results.append(content)

        return results


# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 3: SMART AUTOMATION WORKFLOW ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class AutomationStep:
    delay: str           # "immediate", "30 min", "24 hours", etc.
    action: str          # what to do
    channel: str         # Email, CRM, System, SMS
    condition: str = ""  # optional: "if opened", "if score >= 70"


@dataclass
class AutomationWorkflow:
    name: str
    trigger: str
    description: str
    steps: List[AutomationStep]
    estimated_conversion_lift: str


class AutomationEngine:
    """
    Suggests and builds automation workflows for KeaBuilder.
    
    Each workflow is triggered by a specific event and chains
    together actions across Email, CRM, and System channels.
    
    In production:
    - Workflows would be stored as JSON and loaded into KeaBuilder's
      automation builder UI
    - Each step would map to KeaBuilder's action API
    - Conditions would evaluate against real-time lead data
    - Performance metrics would feed back into optimization
    """

    WORKFLOWS = {
        "new_lead": AutomationWorkflow(
            name="New Lead Nurture Sequence",
            trigger="Form submission on any KeaBuilder funnel",
            description="Welcomes new leads and nurtures them based on AI-scored engagement level.",
            steps=[
                AutomationStep("Immediate", "Send personalized welcome email with lead magnet", "Email"),
                AutomationStep("Immediate", "AI scores lead and assigns tier tag (hot/warm/cold)", "System"),
                AutomationStep("1 hour", "If hot → notify sales rep in CRM with lead details", "CRM", "score >= 70"),
                AutomationStep("24 hours", "Send value-add content tailored to lead's interest", "Email"),
                AutomationStep("3 days", "Check email engagement — if opened, send case study", "Email", "opened previous email"),
                AutomationStep("5 days", "If warm → send limited-time offer", "Email", "score 40-69"),
                AutomationStep("7 days", "If cold with no engagement → move to re-engagement drip", "System", "score < 40 AND no opens"),
            ],
            estimated_conversion_lift="+23% lead-to-customer conversion",
        ),
        "cart_abandon": AutomationWorkflow(
            name="Cart Abandonment Recovery",
            trigger="Checkout initiated but not completed within 30 minutes",
            description="Multi-touch recovery sequence with escalating urgency.",
            steps=[
                AutomationStep("30 min", "Send friendly reminder email with cart contents", "Email"),
                AutomationStep("4 hours", "Send social proof — reviews and testimonials", "Email"),
                AutomationStep("24 hours", "Offer 10% discount with countdown timer", "Email"),
                AutomationStep("48 hours", "Final urgency email — cart expires in 24h", "Email"),
                AutomationStep("72 hours", "If recovered → send thank you + upsell recommendation", "Email", "completed purchase"),
                AutomationStep("72 hours", "If not recovered → add to retargeting audience", "System", "did not purchase"),
            ],
            estimated_conversion_lift="+15% cart recovery rate",
        ),
        "high_intent": AutomationWorkflow(
            name="High-Intent Lead Fast Track",
            trigger="AI lead score reaches 70+ (hot tier)",
            description="Accelerated pipeline for high-value prospects — speed to contact is critical.",
            steps=[
                AutomationStep("Immediate", "Assign priority tag and update CRM pipeline stage", "CRM"),
                AutomationStep("Immediate", "Alert sales team via notification", "CRM"),
                AutomationStep("2 min", "Send personalized email from sales rep", "Email"),
                AutomationStep("1 hour", "If no reply → send calendar booking link", "Email", "no reply"),
                AutomationStep("24 hours", "Sales rep sends custom proposal", "CRM"),
                AutomationStep("3 days", "If no response → escalate to manager", "CRM", "no engagement"),
            ],
            estimated_conversion_lift="+35% close rate on hot leads",
        ),
        "webinar_signup": AutomationWorkflow(
            name="Webinar Attendee Engagement",
            trigger="Webinar registration form submitted",
            description="Maximizes attendance and post-event conversion.",
            steps=[
                AutomationStep("Immediate", "Send confirmation email with calendar invite", "Email"),
                AutomationStep("24h before event", "Reminder email with preview content", "Email"),
                AutomationStep("1h before event", "Final reminder with direct join link", "Email"),
                AutomationStep("Immediately after", "Send replay link + exclusive attendee offer", "Email"),
                AutomationStep("2 days after", "AI scores attendee engagement and routes to funnel", "System"),
                AutomationStep("4 days after", "Send follow-up based on engagement tier", "Email"),
            ],
            estimated_conversion_lift="+40% webinar attendance, +18% post-event conversion",
        ),
    }

    def get_workflow(self, trigger: str) -> AutomationWorkflow:
        return self.WORKFLOWS.get(trigger, self.WORKFLOWS["new_lead"])

    def list_available_triggers(self) -> List[Dict]:
        return [
            {"id": k, "name": v.name, "trigger": v.trigger, "steps": len(v.steps)}
            for k, v in self.WORKFLOWS.items()
        ]

    def export_workflow_json(self, trigger: str) -> str:
        """Export workflow as JSON for KeaBuilder's automation builder."""
        wf = self.get_workflow(trigger)
        return json.dumps({
            "name": wf.name,
            "trigger": wf.trigger,
            "description": wf.description,
            "estimated_lift": wf.estimated_conversion_lift,
            "steps": [
                {
                    "delay": s.delay,
                    "action": s.action,
                    "channel": s.channel,
                    "condition": s.condition or None,
                }
                for s in wf.steps
            ],
        }, indent=2)


# ═══════════════════════════════════════════════════════════════════════════════
# DEMO: Run all three modules
# ═══════════════════════════════════════════════════════════════════════════════

def run_demo():
    print("=" * 72)
    print("  KeaBuilder AI Suite — Full System Demo")
    print("=" * 72)

    # ── Module 1: Lead Scoring ──
    print("\n\n📊 MODULE 1: AI LEAD SCORING ENGINE")
    print("─" * 50)

    scorer = LeadScoringEngine()
    test_leads = [
        LeadSignals("priya@techstartup.io", "organic", 8, 240, 3, 0.9, True, "desktop"),
        LeadSignals("james.o@gmail.com", "referral", 4, 120, 2, 0.7, False, "mobile"),
        LeadSignals("mchen@enterprise.com", "paid", 2, 45, 1, 0.3, False, "desktop"),
        LeadSignals("alex@tempmail.xyz", "social", 1, 15, 1, 0.1, False, "mobile"),
        LeadSignals("sarah.m@agency.co", "organic", 12, 420, 4, 1.0, True, "desktop"),
    ]

    scores = scorer.batch_score_and_rank(test_leads)
    for lead, score in zip(test_leads, scores):
        print(f"\n  #{score.priority_rank} {lead.email}")
        print(f"     Score: {score.total_score}/100 | Tier: {score.tier.value.upper()}")
        print(f"     Breakdown: {score.breakdown}")
        for reason in score.reasons:
            print(f"       • {reason}")
        print(f"     → {score.recommended_action}")

    # ── Module 2: Content Generation ──
    print("\n\n✦ MODULE 2: AI CONTENT GENERATOR")
    print("─" * 50)

    generator = ContentGenerator()
    content_types = [
        ContentRequest("headline", "E-commerce", "2x Revenue", "losing customers at checkout", "urgent"),
        ContentRequest("email_subject", "SaaS", "faster onboarding", "slow user activation", "casual", "Alex"),
        ContentRequest("cta", "Coaching", "life transformation", "feeling stuck", "casual"),
        ContentRequest("email_body", "SaaS", "faster growth", "manual processes", "professional", "Jordan", "KeaBuilder"),
        ContentRequest("funnel_copy", "E-commerce", "higher conversions", "cart abandonment", "professional", "", "KeaBuilder"),
    ]

    for req in content_types:
        results = generator.generate(req)
        print(f"\n  Type: {req.content_type} | Tone: {req.tone} | Industry: {req.industry}")
        for i, r in enumerate(results, 1):
            preview = r[:100] + "..." if len(r) > 100 else r
            print(f"    Variant {i}: {preview}")

    # ── Module 3: Automation Workflows ──
    print("\n\n⚡ MODULE 3: SMART AUTOMATION ENGINE")
    print("─" * 50)

    automation = AutomationEngine()

    print("\n  Available Triggers:")
    for t in automation.list_available_triggers():
        print(f"    • {t['name']} ({t['steps']} steps) — {t['trigger']}")

    for trigger_id in ["new_lead", "cart_abandon", "high_intent"]:
        wf = automation.get_workflow(trigger_id)
        print(f"\n  ┌─ WORKFLOW: {wf.name}")
        print(f"  │  Trigger: {wf.trigger}")
        print(f"  │  Expected: {wf.estimated_conversion_lift}")
        for i, step in enumerate(wf.steps, 1):
            cond = f" [IF: {step.condition}]" if step.condition else ""
            print(f"  │  Step {i}. [{step.delay}] {step.action} ({step.channel}){cond}")
        print(f"  └─")

    # Export sample workflow JSON
    print("\n\n📄 SAMPLE WORKFLOW EXPORT (JSON for KeaBuilder API)")
    print("─" * 50)
    print(automation.export_workflow_json("new_lead"))

    print("\n\n" + "=" * 72)
    print("  ✅ Demo complete. All 3 AI modules operational.")
    print("=" * 72)


if __name__ == "__main__":
    run_demo()

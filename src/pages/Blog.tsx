/** @format */

import React, { useState } from "react";
import "./Blog.css";

interface Post {
  id: string;
  date: string;
  title: string;
  tags: string[];
  summary: string;
  sourceUrl: string;
  sourceLabel: string;
  body: React.ReactNode;
}

const posts: Post[] = [
  {
    id: "multi-agent-orchestration",
    date: "2026-03-12",
    title: "Multi-Agent Orchestration Patterns in Production",
    tags: ["GenAI", "Architecture", "Multi-Agent"],
    summary:
      "Single-agent architectures break down at scale. Here's a practitioner's breakdown of supervisor, hierarchical, and fan-out/fan-in patterns — plus the governance and observability layers that make them production-ready.",
    sourceUrl: "",
    sourceLabel: "",
    body: (
      <>
        <p className="blog-body">
          If you've built a GenAI prototype with a single LLM call and a system prompt, you've probably hit
          the wall: as task complexity grows, a <span className="hl-orange">single-agent architecture</span> becomes
          brittle. Prompts balloon, tool-calling accuracy drops, and latency spirals. The answer isn't a
          bigger model — it's orchestration.
        </p>

        <h4 className="blog-subheading">Why Single-Agent Breaks Down</h4>
        <p className="blog-body">
          A single agent handling research, analysis, writing, and validation simultaneously suffers from
          context window dilution. Each additional responsibility degrades performance on all the others.
          In production credit risk systems I've built, splitting a monolithic agent into{" "}
          <span className="hl-green">11 specialized components</span> reduced error rates by 40% and cut
          latency by 60%.
        </p>

        <h4 className="blog-subheading">Key Orchestration Patterns</h4>
        <div className="callout-box">
          <div className="callout-label">Supervisor Pattern</div>
          <p>
            A <span className="hl-orange">supervisor agent</span> routes tasks to specialized worker agents
            based on intent classification. The supervisor maintains global state and decides when to
            delegate, aggregate, or escalate. Best for workflows with clear task boundaries — like routing
            a KYB assessment across URL discovery, content extraction, and risk scoring agents.
          </p>
        </div>

        <div className="callout-box">
          <div className="callout-label">Hierarchical Pattern</div>
          <p>
            Extends the supervisor pattern with <span className="hl-blue">multiple layers of delegation</span>.
            A top-level orchestrator delegates to mid-level supervisors, each managing their own worker pools.
            This is how complex financial research suites scale — a credit memo orchestrator delegates to
            domain-specific supervisors (financial analysis, ESG, competitive intelligence), each running
            their own sub-agents.
          </p>
        </div>

        <div className="callout-box">
          <div className="callout-label">Parallel Fan-Out / Fan-In</div>
          <p>
            When tasks are independent, <span className="hl-purple">fan them out concurrently</span> and
            merge results. This is critical for latency-sensitive applications. In brand risk assessment,
            running product scraping, checkout verification, and regulatory analysis in parallel (with
            semaphore-controlled concurrency) cuts wall-clock time from minutes to seconds.
          </p>
        </div>

        <h4 className="blog-subheading">Governance: The Missing Layer</h4>
        <p className="blog-body">
          Orchestration without governance is a liability. Production multi-agent systems need{" "}
          <span className="hl-orange">Human-in-the-Loop (HITL) gates</span> for high-stakes decisions,
          configurable approval workflows, and output validation layers. In financial services, this means
          a credit analyst reviews AI-generated risk assessments before they reach downstream systems.
          Without these guardrails, you're deploying autonomous decision-making with no accountability.
        </p>

        <h4 className="blog-subheading">Observability: Tracing the Invisible</h4>
        <p className="blog-body">
          Multi-agent systems are notoriously hard to debug. End-to-end tracing (via tools like{" "}
          <span className="hl-green">LangFuse</span>) is non-negotiable. You need visibility into
          token usage per agent, tool-selection accuracy, latency breakdowns per orchestration step,
          and <span className="hl-blue">output drift detection</span> across model versions. Without
          observability, you're flying blind — and your customers will notice before you do.
        </p>

        <div className="callout-box">
          <div className="callout-label">Bottom Line</div>
          <p>
            Multi-agent orchestration isn't about complexity for complexity's sake. It's about decomposing
            hard problems into solvable units, governing their interactions responsibly, and observing
            everything. The frameworks exist (LangGraph makes this remarkably tractable) — the challenge
            is designing the right architecture for your customer's specific problem.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "rag-vs-fine-tuning",
    date: "2026-03-10",
    title: "RAG vs Fine-Tuning: A Production Decision Framework",
    tags: ["GenAI", "RAG", "Architecture"],
    summary:
      "When should you reach for RAG, when does fine-tuning make sense, and when is prompt engineering enough? A practitioner's decision framework based on real production trade-offs — not hype.",
    sourceUrl: "",
    sourceLabel: "",
    body: (
      <>
        <p className="blog-body">
          Every GenAI project hits the same fork in the road: your base model isn't good enough out of the box.
          The question is <span className="hl-orange">how you close the gap</span> — and the answer depends on
          your data volatility, latency budget, cost constraints, and how specialized the task really is.
        </p>

        <h4 className="blog-subheading">The Decision Framework</h4>
        <p className="blog-body">
          After deploying production systems across financial services and healthcare, I've landed on a simple
          decision hierarchy. Start with the cheapest, fastest option and escalate only when the evidence demands it.
        </p>

        <div className="callout-box">
          <div className="callout-label">Level 1: Prompt Engineering</div>
          <p>
            <span className="hl-green">Time to deploy: hours to days.</span> If your task can be solved with
            better instructions, few-shot examples, and structured output schemas — stop here. Most teams
            underestimate how far a well-crafted system prompt with 5-10 few-shot examples can go. In production
            KYB assessments, prompt engineering alone achieved 85% of our target accuracy before we added any
            retrieval layer.
          </p>
        </div>

        <div className="callout-box">
          <div className="callout-label">Level 2: RAG (Retrieval-Augmented Generation)</div>
          <p>
            <span className="hl-blue">Time to deploy: days to weeks.</span> Choose RAG when your knowledge base
            is volatile (changes weekly or faster), when you need source attribution and citations, or when the
            domain knowledge is too large to fit in a prompt. RAG shines in enterprise settings — internal
            knowledge bases, regulatory documents, customer support — where the data changes frequently and
            traceability matters. The cost is infrastructure: vector databases, chunking pipelines, embedding
            models, and retrieval evaluation.
          </p>
        </div>

        <div className="callout-box">
          <div className="callout-label">Level 3: Fine-Tuning</div>
          <p>
            <span className="hl-purple">Time to deploy: weeks to months.</span> Fine-tune only when you need the
            model to internalize stable, specialized behavior that can't be achieved through instructions or
            retrieval. Common signals: domain-specific output formats, consistent tone/style across thousands of
            outputs, or specialized reasoning patterns (like medical NER or financial entity extraction). The
            trade-offs are real — training data curation, evaluation pipelines, model versioning, and inference
            costs that can be 3-6x higher than base model API calls.
          </p>
        </div>

        <h4 className="blog-subheading">The Hybrid Reality</h4>
        <p className="blog-body">
          In practice, production systems rarely use just one approach. The credit memo system I built uses{" "}
          <span className="hl-orange">all three</span>: prompt engineering for structured output formatting,
          RAG for real-time financial data and news retrieval, and fine-tuned models for domain-specific entity
          extraction. The key is knowing which layer solves which problem — and not reaching for fine-tuning
          when a better prompt would suffice.
        </p>

        <h4 className="blog-subheading">Cost Reality Check</h4>
        <p className="blog-body">
          A common mistake is ignoring the total cost of ownership. RAG adds infrastructure cost (vector DB
          hosting, embedding compute, chunking pipelines) but keeps your model costs low. Fine-tuning has high
          upfront cost (data curation, training compute, evaluation) and ongoing inference premium. For most
          enterprise use cases, <span className="hl-green">RAG delivers 80% of the value at 20% of the cost</span>{" "}
          compared to fine-tuning. Reserve fine-tuning for the cases where that last 20% actually matters — like
          regulated industries where output consistency is non-negotiable.
        </p>

        <div className="callout-box">
          <div className="callout-label">Bottom Line</div>
          <p>
            Don't start with the most complex solution. Prompt engineering first, RAG when your knowledge is
            dynamic, fine-tuning when behavior must be internalized. The best GenAI architectures use the right
            tool at each layer — and the engineer's job is knowing which layer to invest in for the customer's
            specific problem.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "agentic-governance",
    date: "2026-03-09",
    title: "Designing Governance for Agentic AI Systems",
    tags: ["GenAI", "Governance", "Architecture"],
    summary:
      "Agentic AI without governance is a liability. Here's how to design Human-in-the-Loop gates, approval workflows, observability layers, and compliance controls for production multi-agent systems.",
    sourceUrl: "",
    sourceLabel: "",
    body: (
      <>
        <p className="blog-body">
          The industry is racing to deploy <span className="hl-orange">agentic AI</span> — systems where LLMs
          autonomously call tools, make decisions, and chain actions together. But autonomy without accountability
          is a liability, especially in regulated industries like financial services and healthcare. The missing
          piece isn't better models — it's governance architecture.
        </p>

        <h4 className="blog-subheading">Why Governance Can't Be an Afterthought</h4>
        <p className="blog-body">
          When an agent autonomously generates a credit risk assessment, executes a KYB compliance check, or
          produces a medical NER extraction — the output directly influences business decisions. If the agent
          hallucinates a risk score, misclassifies a merchant, or extracts the wrong medication dosage,{" "}
          <span className="hl-orange">the downstream consequences are real</span>. Governance isn't about slowing
          down AI — it's about making AI trustworthy enough to deploy at scale.
        </p>

        <h4 className="blog-subheading">Core Governance Patterns</h4>
        <div className="callout-box">
          <div className="callout-label">Human-in-the-Loop (HITL) Gates</div>
          <p>
            Not every agent action needs human review — but <span className="hl-green">high-stakes decisions must</span>.
            Design HITL gates at critical decision points: before a credit risk assessment is finalized, before a
            compliance report is submitted, before a patient-facing recommendation is generated. The key is making
            the gate lightweight — present the agent's reasoning, confidence scores, and source citations so the
            human reviewer can approve or reject in seconds, not minutes.
          </p>
        </div>

        <div className="callout-box">
          <div className="callout-label">Configurable Approval Workflows</div>
          <p>
            Different risk levels need different approval paths. In production credit risk systems, I implement{" "}
            <span className="hl-blue">tiered approval workflows</span>: low-risk assessments auto-approve with
            audit logging, medium-risk assessments require single-reviewer approval, and high-risk decisions
            require multi-reviewer consensus with mandatory justification. The workflow configuration should be
            externalized (not hardcoded) so compliance teams can adjust thresholds without engineering changes.
          </p>
        </div>

        <div className="callout-box">
          <div className="callout-label">Output Validation Layers</div>
          <p>
            Before any agent output reaches downstream systems, run it through{" "}
            <span className="hl-purple">automated validation</span>: schema validation (does the output match
            the expected structure?), factual grounding checks (are claims supported by retrieved sources?),
            consistency checks (does this assessment contradict previous assessments for the same entity?), and
            safety filters (does the output contain PII, toxic content, or unauthorized disclosures?).
          </p>
        </div>

        <div className="callout-box">
          <div className="callout-label">Observability & Audit Trails</div>
          <p>
            Every agent action must be traceable. Deploy end-to-end tracing (I use{" "}
            <span className="hl-green">LangFuse</span>) that captures: which agent made which decision, what
            tools were called with what parameters, what data was retrieved and from which sources, token usage
            and latency per step, and the final output with confidence scores. This isn't optional for regulated
            industries — it's how you answer "why did the system make this decision?" during an audit.
          </p>
        </div>

        <h4 className="blog-subheading">Drift Detection: The Silent Killer</h4>
        <p className="blog-body">
          Model providers update their models without notice. A prompt that worked perfectly with GPT-4-0613
          might behave differently with GPT-4-0125. In multi-agent systems, this drift compounds — a subtle
          change in one agent's output format can cascade through the entire orchestration graph.{" "}
          <span className="hl-orange">Automated regression testing</span> with LLM-as-a-judge patterns is
          essential. Run your evaluation suite on every model version change, every prompt update, and every
          retrieval pipeline modification.
        </p>

        <h4 className="blog-subheading">Compliance in Practice</h4>
        <p className="blog-body">
          In Singapore's regulatory landscape, AI governance intersects with{" "}
          <span className="hl-blue">PDPA (Personal Data Protection Act)</span> requirements, MAS guidelines
          on AI in financial services, and emerging responsible AI frameworks. The governance architecture must
          ensure data minimization (agents only access data they need), purpose limitation (agent actions are
          scoped to authorized tasks), and accountability (every decision has a clear audit trail linking AI
          output to human oversight).
        </p>

        <div className="callout-box">
          <div className="callout-label">Bottom Line</div>
          <p>
            Agentic AI governance isn't a checkbox — it's an architecture decision. Design HITL gates at high-stakes
            decision points, implement tiered approval workflows, validate outputs before they reach downstream
            systems, and trace everything. The organizations that get governance right will be the ones that
            deploy agentic AI at scale. The ones that skip it will learn the hard way.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "netflix-interpositive",
    date: "2026-03-07",
    title: "Netflix Acquires InterPositive: AI Meets Hollywood",
    tags: ["AI", "M&A", "Entertainment"],
    summary:
      "Netflix acquired InterPositive, the AI filmmaking startup founded by Ben Affleck, signaling a strategic bet on AI-assisted post-production tooling rather than generative content creation.",
    sourceUrl: "https://x.com/fridayjam_/status/2029798211259687030",
    sourceLabel: "View original thread on X",
    body: (
      <>
        <p className="blog-body">
          Netflix has acquired <span className="hl-orange">InterPositive</span>, a 16-person AI startup founded by
          Ben Affleck that has been operating in stealth since 2022. The deal marks Netflix's first acquisition since
          walking away from the Warner Bros. Discovery bidding war — and it reveals a lot about where the streamer
          sees AI fitting into its creative pipeline.
        </p>

        <h4 className="blog-subheading">What InterPositive Actually Does</h4>
        <p className="blog-body">
          Unlike companies pushing generative AI video (think Sora or Runway), InterPositive built tools that help
          production teams work with <span className="hl-green">their own footage</span>. The team filmed a proprietary
          dataset on a controlled soundstage and trained a model to understand visual logic, editorial consistency,
          and cinematic rules — handling real-world challenges like missing shots, background replacements, and
          lighting mismatches in post-production.
        </p>

        <h4 className="blog-subheading">Key Analytical Takeaways</h4>
        <div className="callout-box">
          <div className="callout-label">Strategic Positioning</div>
          <p>
            Netflix is deliberately positioning AI as a <span className="hl-orange">tool for filmmakers</span>, not a
            replacement. By acquiring technology that "keeps filmmakers at the center of the process," Netflix sidesteps
            the labor-relations minefield that has plagued other studios' AI initiatives. This is a politically astute
            move in a post-strike Hollywood landscape.
          </p>
        </div>

        <div className="callout-box">
          <div className="callout-label">M&A Signal</div>
          <p>
            The timing matters. Coming off the WBD bidding withdrawal, this smaller, targeted acquisition signals that
            Netflix is pivoting toward <span className="hl-blue">build-and-buy of vertical AI capabilities</span> rather
            than horizontal media consolidation. Acquiring a 16-person team with proprietary training data is a
            high-ROI move compared to billion-dollar studio deals.
          </p>
        </div>

        <div className="callout-box">
          <div className="callout-label">Industry Implications</div>
          <p>
            This deal validates the thesis that <span className="hl-purple">AI adoption in creative industries</span> will
            be led by workflow-enhancement tools rather than content-generation tools. Studios that frame AI as
            augmenting human creativity — rather than replacing it — will face less regulatory and union resistance,
            creating a faster path to production-scale deployment.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "applovin-ad-mediation",
    date: "2026-03-08",
    title: "AppLovin's Structural Moat in Ad Mediation",
    tags: ["AdTech", "AI", "Finance"],
    summary:
      "AppLovin (MAX) commands ~60% of the ad mediation market. With Axon 2.0 pushing conversion rates from 1.3% to 5% and e-commerce potential at 5-10x gaming, the structural advantages are compounding.",
    sourceUrl: "https://x.com/fridayjam_/status/2029407083129651317",
    sourceLabel: "View original thread on X",
    body: (
      <>
        <p className="blog-body">
          <span className="hl-orange">AppLovin's MAX</span> platform owns approximately 60–65% of the mobile ad
          mediation market — a dominance that gives them a critical first-mover advantage on data. When you control
          mediation, you see the data before anyone else, and that information asymmetry compounds over time.
        </p>

        <h4 className="blog-subheading">Market Share Breakdown</h4>
        <div className="blog-table-wrap">
          <table className="blog-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Est. Share (Mediation)</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="hl-orange">AppLovin (MAX)</span></td>
                <td>60% – 65%</td>
                <td>Market Leader / Infrastructure</td>
              </tr>
              <tr>
                <td>Google (AdMob/Ad Manager)</td>
                <td>15% – 20%</td>
                <td>Ecosystem Giant</td>
              </tr>
              <tr>
                <td>Unity Software (LevelPlay)</td>
                <td>10% – 12%</td>
                <td>Direct Rival (Struggling)</td>
              </tr>
              <tr>
                <td>Meta (Audience Network)</td>
                <td>~5%</td>
                <td>Social-to-App Specialist</td>
              </tr>
              <tr>
                <td>Others (InMobi, Mintegral)</td>
                <td>~5%</td>
                <td>Niche / Regional Players</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 className="blog-subheading">Key Analytical Takeaways</h4>
        <div className="callout-box">
          <div className="callout-label">Axon 2.0 & Profit Scaling</div>
          <p>
            AppLovin's <span className="hl-green">Axon 2.0</span> AI engine has pushed conversion rates from 1.3% to 5%
            on a fixed-cost spread. This is the key insight — when your cost structure is largely fixed and your
            conversion rate nearly quadruples, you get <span className="hl-orange">exponential profit scaling</span>,
            not linear growth. The operating leverage here is extraordinary.
          </p>
        </div>

        <div className="callout-box">
          <div className="callout-label">E-Commerce Expansion</div>
          <p>
            The e-commerce opportunity is estimated at <span className="hl-blue">5–10x the size of gaming</span>. If
            AppLovin can replicate its mediation dominance in e-commerce ad spend, the total addressable market
            expansion is massive. Early signals show 45% higher ROAS than Meta — achieved with a team of only ~15
            people — which speaks to the AI-driven efficiency of their platform.
          </p>
        </div>

        <div className="callout-box">
          <div className="callout-label">Competitive Risks</div>
          <p>
            The moat is real but not unassailable. <span className="hl-purple">Google and Meta</span> have deeper
            pockets and proprietary walled-garden data. Unity's engine integration gives it a "first-touch" advantage
            with game developers. And <span className="hl-purple">CloudX</span> has been flagged by analysts as a
            potential disruptor to AppLovin's distribution advantage. Still, at 60%+ market share with compounding
            data advantages, the burden of proof lies with challengers.
          </p>
        </div>
      </>
    ),
  },
];

const Blog: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="blog-wrap">
      <div className="prompt-line">
        <span className="prompt-path">~/portfolio</span>
        <span className="prompt-sep"> $ </span>
        <span className="prompt-cmd">cat blog.md</span>
      </div>

      <h2 className="section-heading">Blog</h2>

      <p className="blog-intro">
        Thoughts on <span className="hl-orange">AI</span>,{" "}
        <span className="hl-blue">GenAI solutions</span>, and everything in between.
        <br />
        <span className="blog-intro-sub">Long-form analysis written for curious minds — no jargon required.</span>
      </p>

      <div className="blog-grid">
        {posts.map((post) => {
          const isOpen = expandedId === post.id;
          return (
            <article
              key={post.id}
              className={`blog-card${isOpen ? " blog-card-expanded" : ""}`}
              onClick={() => toggle(post.id)}
            >
              <div className="blog-card-header">
                <span className="blog-date">{post.date}</span>
                <div className="blog-tags">
                  {post.tags.map((tag) => (
                    <span key={tag} className="blog-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <h3 className="blog-card-title">{post.title}</h3>
              <p className="blog-card-summary">{post.summary}</p>

              {isOpen && (
                <div className="blog-card-body" onClick={(e) => e.stopPropagation()}>
                  <hr className="terminal-divider" />
                  {post.body}
                  {post.sourceUrl && (
                    <div className="blog-source">
                      <a
                        href={post.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="blog-source-link"
                      >
                        <i className="bi bi-twitter-x"></i> {post.sourceLabel}
                      </a>
                    </div>
                  )}
                </div>
              )}

              <span className="blog-toggle-hint">
                {isOpen ? "click to collapse ↑" : "click to expand ↓"}
              </span>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default Blog;

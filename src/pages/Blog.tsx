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
    id: "llm-as-a-judge",
    date: "2026-05-19",
    title: "LLM-as-a-judge in the Hot Path: Production Lessons",
    tags: ["GenAI", "Evaluation", "Production"],
    summary:
      "Running LLM-as-a-judge synchronously in a production request path forces hard tradeoffs between latency and signal quality. Here's what we measured about threshold calibration, latency budgets, and when to route the judge off the critical path.",
    sourceUrl: "",
    sourceLabel: "",
    body: (
      <>
        <p className="blog-body">
          The standard advice for{" "}
          <span className="hl-orange">LLM-as-a-judge</span> is to run it offline, as an eval
          harness that gates deployments. That is correct advice, and you should do it. But some
          production workflows need a quality gate in the request path itself: a final check before
          the output reaches the user, with enough signal to suppress or reroute a bad response.
          This is where things get interesting and where the textbook advice breaks down.
        </p>

        <h4 className="blog-subheading">Why Synchronous Judging</h4>
        <p className="blog-body">
          In document-processing pipelines where the output feeds directly into a downstream
          automated workflow, a silent bad output is far more costly than a visible one. An
          LLM-generated credit memo with a hallucinated figure can propagate through three
          downstream systems before a human notices. A synchronous judge that catches 80% of those
          cases before they escape is worth the latency. The question is: how much latency, at
          what threshold, and which model?
        </p>

        <h4 className="blog-subheading">Threshold Selection</h4>
        <div className="callout-box">
          <div className="callout-label">The False-Positive Trap</div>
          <p>
            A judge with a generous pass threshold misses bad outputs. A judge with a strict
            threshold triggers on acceptable outputs and creates support load. We found that
            calibrating on <span className="hl-orange">a hand-labeled validation set of 200 examples</span>{" "}
            (50 clear passes, 100 borderline, 50 clear failures) was necessary to set a threshold
            that respected both error types. Operating from first principles produced a threshold
            that was either 15% too strict or 20% too lenient, depending on the prompt wording.
          </p>
        </div>

        <h4 className="blog-subheading">Latency Tradeoffs</h4>
        <p className="blog-body">
          A synchronous judge adds one additional LLM call to the critical path.{" "}
          <span className="hl-blue">Haiku-class models</span> add around 200ms at the 95th
          percentile; <span className="hl-blue">Sonnet-class models</span> add 800ms to 1.5s. For
          most document workflows, 800ms is acceptable. For conversational interfaces it is not.
          We used a{" "}
          <span className="hl-green">tiered routing strategy</span>: low-confidence primary outputs
          (where the primary model already flagged uncertainty via logprobs or structured reasoning)
          go to the Sonnet judge; high-confidence outputs go to the Haiku judge. This cut median
          judging latency by 45% without measurably degrading catch rate.
        </p>

        <div className="callout-box">
          <div className="callout-label">Eval in CI</div>
          <p>
            The judge itself needs to be evaluated. A prompt change in the judge can shift the
            threshold without you noticing until a production incident. We added a{" "}
            <span className="hl-purple">judge eval step in CI</span>: on every pull request touching
            the judge prompt, the pipeline runs the validation set and blocks merge if the pass rate
            on known-good examples drops below 90% or the catch rate on known-bad examples drops
            below 80%. This adds ~3 minutes to CI but has caught three regressions in prompt
            wording that would otherwise have shipped.
          </p>
        </div>

        <div className="callout-box">
          <div className="callout-label">When to Skip the Judge</div>
          <p>
            LLM-as-a-judge in the hot path is not always the right answer. For structured outputs
            validated by Pydantic schemas, the schema IS the judge and a second LLM call adds only
            latency. For low-stakes conversational outputs, the cost-benefit rarely closes. The
            judge earns its latency budget only when: (1) the output is complex prose with
            factual claims, (2) silent errors are materially more costly than visible ones, and
            (3) a human review loop is not operationally feasible on every response.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "mcp-server-production",
    date: "2026-04-14",
    title: "Building an MCP Server for a Production App",
    tags: ["MCP", "AI Engineering", "Production"],
    summary:
      "The MCP spec tells you how to define tools. It does not tell you how to handle JWT expiry mid-session, how to expose binary downloads over a JSON protocol, or how to design 14 tool domains so an LLM actually picks the right one. Here is what we worked out.",
    sourceUrl: "",
    sourceLabel: "",
    body: (
      <>
        <p className="blog-body">
          When the team decided to expose our platform API as an{" "}
          <span className="hl-orange">MCP server</span>, the documentation covered the basics:
          define tools, return results, handle errors. What it did not cover was any of the
          problems that appear when you run this in production against a real enterprise SaaS
          platform with JWT auth, large binary payloads, and 14+ distinct API domains. This post
          covers the three problems that took the most iteration to solve.
        </p>

        <h4 className="blog-subheading">The Re-Auth Problem</h4>
        <p className="blog-body">
          MCP connections in agentic workflows are long-lived. An agent that starts a multi-step
          task at 9am may still be running tool calls at 11am. JWTs expire, typically in 15 to 60
          minutes. If your server naively forwards the token and the platform returns a 401, the
          MCP client sees a tool error and the agent either halts or retries without knowing why.
        </p>
        <div className="callout-box">
          <div className="callout-label">Transparent Re-Auth Pattern</div>
          <p>
            We solved this with a <span className="hl-green">transparent re-auth interceptor</span>:
            the server catches 401s from the upstream API, silently calls the platform's token
            refresh endpoint using the stored refresh token, updates the session, and retries the
            original request before surfacing any response to the LLM. From the agent's perspective,
            the tool call succeeded. Sessions are persisted in{" "}
            <span className="hl-blue">Redis</span> so MCP reconnects do not trigger a fresh login
            and do not lose in-flight context.
          </p>
        </div>

        <h4 className="blog-subheading">Tool Schema Design at Scale</h4>
        <p className="blog-body">
          With 14 API domains (documents, users, workflows, reports, integrations...), naive
          exposure produces a tool list that overwhelms the LLM's tool-selection mechanism.
          We went through three schema iterations:
        </p>
        <p className="blog-body">
          Version 1: flat list of 60+ tools with generic names like{" "}
          <span className="hl-orange">get_item</span> and{" "}
          <span className="hl-orange">create_record</span>. The LLM picked randomly between
          ambiguous tools and required heavy prompt steering.{" "}
          Version 2: domain-prefixed names (<span className="hl-blue">documents__list</span>,{" "}
          <span className="hl-blue">documents__upload</span>) with action-oriented descriptions
          written from the LLM's perspective ("Use this to retrieve a paginated list of documents
          in a folder"). Tool-selection accuracy improved substantially.{" "}
          Version 3: description length discipline: 15 to 25 words per description, no nested
          clauses. Shorter descriptions outperformed longer ones for tool routing in every test.
        </p>

        <h4 className="blog-subheading">Binary Transfers over JSON</h4>
        <p className="blog-body">
          MCP is a JSON protocol, which creates friction for file uploads and downloads.{" "}
          <span className="hl-purple">Upload</span>: we route large files through a small HTTP
          sidecar endpoint that accepts multipart form data and returns a file ID; the MCP upload
          tool passes that ID to the platform API. This avoids encoding multi-megabyte files as
          base64 in the JSON message stream.{" "}
          <span className="hl-purple">Download</span>: binary assets (PDFs, reports) are streamed
          from the platform API, base64-encoded, and returned as a typed MCP result with the
          correct MIME type. Any MCP client can reconstruct the file without custom transport logic.
        </p>

        <div className="callout-box">
          <div className="callout-label">Bottom Line</div>
          <p>
            Building a production MCP server is a substantially different problem from building
            an MCP demo. The protocol handles the happy path. Auth lifecycle, binary data, and
            tool schema design at scale all require patterns the spec does not provide. The three
            solutions above (transparent re-auth, domain-prefixed schema discipline, and sidecar
            uploads) are now stable and have been running in production for several months.
          </p>
        </div>
      </>
    ),
  },
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

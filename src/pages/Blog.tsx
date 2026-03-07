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
        <span className="hl-blue">Finance</span>, and everything in between.
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

/** @format */

import React, { useState } from "react";
import "./Skills.css";

interface SkillGroup {
  key: string;
  label: string;
  color: string;
  items: string[];
}

const SKILL_GROUPS: SkillGroup[] = [
  {
    key: "genai",
    label: "genai & llms",
    color: "green",
    items: ["LangGraph", "LangChain", "OpenAI", "Anthropic", "LangFuse", "PyTorch", "HuggingFace", "Pydantic", "SpaCy", "Kedro"],
  },
  {
    key: "solution_design",
    label: "solution design",
    color: "purple",
    items: ["Solution Architecture", "Customer Requirements Analysis", "AgentOps", "MLOps", "Technical Documentation", "Responsible AI"],
  },
  {
    key: "languages",
    label: "languages",
    color: "orange",
    items: ["Python", "Java", "TypeScript", "JavaScript", "Bash", "HTML", "CSS"],
  },
  {
    key: "backend",
    label: "backend",
    color: "blue",
    items: ["FastAPI", "Flask", "Spring Boot", "NodeJS", "ExpressJS"],
  },
  {
    key: "cloud",
    label: "cloud & infra",
    color: "orange",
    items: ["AWS", "Azure", "Docker", "Kubernetes", "Terraform", "GCP", "Azure Service Bus"],
  },
  {
    key: "databases",
    label: "databases",
    color: "green",
    items: ["MongoDB", "PostgreSQL", "Pinecone", "Weaviate", "ChromaDB", "Redis", "SQL Server", "MySQL"],
  },
  {
    key: "frontend",
    label: "frontend",
    color: "blue",
    items: ["ReactJS", "NextJS", "VueJS", "Svelte", "Tailwind"],
  },
  {
    key: "cicd",
    label: "ci / cd",
    color: "purple",
    items: ["GitHub Actions", "GitLab CI", "Jenkins"],
  },
  {
    key: "experiments",
    label: "experiments",
    color: "green",
    items: ["Coder", "RunAI", "A/B Testing"],
  },
];

const PROFICIENCY: { label: string; pct: number; color: string }[] = [
  { label: "Python",      pct: 90, color: "orange" },
  { label: "LangGraph",   pct: 85, color: "green"  },
  { label: "FastAPI",     pct: 85, color: "purple" },
  { label: "LangChain",   pct: 80, color: "green"  },
  { label: "Docker",      pct: 80, color: "orange" },
  { label: "AWS",         pct: 75, color: "orange" },
  { label: "Azure",       pct: 75, color: "blue"   },
  { label: "MongoDB",     pct: 75, color: "green"  },
  { label: "PyTorch",     pct: 70, color: "green"  },
  { label: "Terraform",   pct: 70, color: "purple" },
  { label: "TypeScript",  pct: 70, color: "blue"   },
  { label: "PostgreSQL",  pct: 70, color: "green"  },
];

const BAR_COLORS: Record<string, string> = {
  orange: "#e8632a",
  green:  "#4ade80",
  blue:   "#60a5fa",
  purple: "#c084fc",
};

const COLOR_MAP: Record<string, string> = {
  orange: "hl-orange",
  green:  "hl-green",
  blue:   "hl-blue",
  purple: "hl-purple",
};

const Skills: React.FC = () => {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="skills-wrap">
      <div className="prompt-line">
        <span className="prompt-path">~/portfolio</span>
        <span className="prompt-sep"> $ </span>
        <span className="prompt-cmd">cat skills.json</span>
      </div>

      <div className="skills-layout">
        {/* ── Left: JSON block ── */}
        <div className="skills-left">
          <div className="skills-output">
            <span className="code-brace hl-orange">{"{"}</span>
            {SKILL_GROUPS.map((group, gi) => (
              <div
                key={group.key}
                className={`skills-group${active === group.key ? " skills-group-active" : ""}`}
                onClick={() => setActive(active === group.key ? null : group.key)}
              >
                <div className="skills-group-key">
                  <span className={COLOR_MAP[group.color]}>&nbsp;&nbsp;"{group.label}"</span>
                  <span className="hl-blue">: [</span>
                  {active !== group.key && (
                    <span className="skills-preview">
                      {group.items.slice(0, 3).join(", ")}
                      {group.items.length > 3 ? ` +${group.items.length - 3} more` : ""}
                    </span>
                  )}
                  {active !== group.key && <span className="hl-blue">]</span>}
                  {active !== group.key && gi < SKILL_GROUPS.length - 1 && (
                    <span className="skills-comma">,</span>
                  )}
                </div>

                {active === group.key && (
                  <div className="skills-items">
                    {group.items.map((item, ii) => (
                      <div key={item} className="skills-item">
                        <span>&nbsp;&nbsp;&nbsp;&nbsp;</span>
                        <span className="str">"{item}"</span>
                        {ii < group.items.length - 1 && <span className="skills-comma">,</span>}
                      </div>
                    ))}
                    <div className="skills-close">
                      <span>&nbsp;&nbsp;</span>
                      <span className="hl-blue">]</span>
                      {gi < SKILL_GROUPS.length - 1 && <span className="skills-comma">,</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <span className="code-brace hl-orange">{"}"}</span>
          </div>
        </div>

        {/* ── Right: proficiency + callout ── */}
        <div className="skills-right">
          <div className="proficiency-block">
            <div className="callout-label">Proficiency</div>
            <div className="proficiency-cmd">
              <span className="cmt">$ benchmark --skills --top=12</span>
            </div>
            <div className="proficiency-list">
              {PROFICIENCY.map((s) => (
                <div key={s.label} className="proficiency-row">
                  <span className="proficiency-name">{s.label}</span>
                  <div className="proficiency-bar-track">
                    <div
                      className="proficiency-bar-fill"
                      style={{
                        width: `${s.pct}%`,
                        backgroundColor: BAR_COLORS[s.color],
                      }}
                    />
                  </div>
                  <span className="proficiency-pct">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="callout-box">
            <div className="callout-label">Note</div>
            <p>Click any category to expand. Currently focused on designing and deploying production GenAI solutions — multi-agent orchestration, enterprise RAG, and agentic governance.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Skills;

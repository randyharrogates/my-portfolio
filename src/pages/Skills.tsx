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
    key: "languages",
    label: "languages",
    color: "orange",
    items: ["Python", "Java", "HTML", "CSS", "JavaScript", "TypeScript", "Bash"],
  },
  {
    key: "ai_ml",
    label: "ai & ml",
    color: "green",
    items: ["OpenAI", "LangGraph", "Kedro", "PyTorch", "HuggingFace", "LangChain", "NLTK"],
  },
  {
    key: "frontend",
    label: "frontend",
    color: "blue",
    items: ["ReactJS", "VueJS"],
  },
  {
    key: "backend",
    label: "backend",
    color: "purple",
    items: ["Spring Boot", "Flask", "FastAPI", "NodeJS", "ExpressJS"],
  },
  {
    key: "cloud",
    label: "cloud & infra",
    color: "orange",
    items: ["Docker", "Kubernetes", "AWS"],
  },
  {
    key: "databases",
    label: "databases",
    color: "green",
    items: ["SQL Server", "MySQL", "PostgreSQL", "MongoDB", "ChromaDB", "Pinecone"],
  },
  {
    key: "cicd",
    label: "ci / cd",
    color: "blue",
    items: ["GitHub Actions", "GitLab CI", "Jenkins"],
  },
  {
    key: "os",
    label: "os",
    color: "purple",
    items: ["Windows", "Ubuntu", "Linux", "MacOS"],
  },
  {
    key: "experiments",
    label: "experiments",
    color: "orange",
    items: ["Coder", "RunAI"],
  },
];

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

      <div className="callout-box" style={{ marginTop: 28 }}>
        <div className="callout-label">Note</div>
        <p>Click any category to expand. Currently focused on building LLM-powered systems and agentic AI architectures.</p>
      </div>
    </div>
  );
};

export default Skills;

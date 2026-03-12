/** @format */

import React from "react";
import "./Skills.css";

interface SkillGroup {
  key: string;
  label: string;
  color: string;
  items: string[];
}

const SKILL_GROUPS: SkillGroup[] = [
  {
    key: "agent_orchestration",
    label: "AI & Agent Orchestration",
    color: "orange",
    items: ["LangGraph", "LangChain", "Multi-Agent Orchestration", "Agentic AI", "RAG Architectures", "Prompt Engineering", "Human-in-the-Loop Governance", "MCP", "NLU", "Intent Classification", "Pydantic", "SpaCy"],
  },
  {
    key: "model_serving",
    label: "Model Training & Serving",
    color: "green",
    items: ["OpenAI API", "Anthropic API", "Gemini API", "PyTorch", "HuggingFace Transformers", "Model Fine-Tuning", "LLM Evaluation", "LangFuse", "Token Optimization", "Latency/Throughput Tuning", "Kedro"],
  },
  {
    key: "solution_arch",
    label: "Solution Architecture",
    color: "purple",
    items: ["Solution Design", "Customer Requirements Analysis", "POC Delivery", "Technical Demos", "Solution Scoping", "AgentOps", "MLOps", "Technical Documentation (BPMN)", "Responsible AI", "Agile/Scrum"],
  },
  {
    key: "cloud_infra",
    label: "Cloud & Infrastructure",
    color: "blue",
    items: ["AWS (ECR, ECS, S3)", "Azure (Container Apps, Service Bus, Blob Storage)", "GCP", "Docker", "Kubernetes", "Terraform (IaC)", "GitHub Actions", "GitLab CI", "CI/CD Pipelines"],
  },
  {
    key: "data_storage",
    label: "Data & Storage",
    color: "green",
    items: ["Pinecone", "Weaviate", "ChromaDB", "MongoDB Atlas", "PostgreSQL", "Redis", "SQL Server", "MySQL"],
  },
  {
    key: "app_dev",
    label: "Application Development",
    color: "orange",
    items: ["Python", "TypeScript", "Java", "FastAPI", "Flask", "Spring Boot", "NodeJS", "ReactJS", "NextJS", "VueJS", "Svelte", "REST API Design", "OpenAPI/Swagger"],
  },
];

const COLOR_MAP: Record<string, string> = {
  orange: "hl-orange",
  green:  "hl-green",
  blue:   "hl-blue",
  purple: "hl-purple",
};

const Skills: React.FC = () => {
  return (
    <div className="skills-wrap">
      <div className="prompt-line">
        <span className="prompt-path">~/portfolio</span>
        <span className="prompt-sep"> $ </span>
        <span className="prompt-cmd">cat skills.json</span>
      </div>

      <div className="skills-grid">
        {SKILL_GROUPS.map((group) => (
          <div key={group.key} className="skills-card">
            <div className={`skills-card-label ${COLOR_MAP[group.color]}`}>
              {group.label}
            </div>
            <div className="skills-chip-list">
              {group.items.map((item) => (
                <span key={item} className={`skills-chip skills-chip-${group.color}`}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="callout-box">
        <div className="callout-label">Note</div>
        <p>Currently focused on designing and deploying production GenAI solutions — multi-agent orchestration, enterprise RAG, and agentic governance.</p>
      </div>
    </div>
  );
};

export default Skills;

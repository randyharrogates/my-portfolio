/** @format */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Projects.css";

interface Project {
  id: number;
  title: string;
  description: string;
  stack: string[];
  image: string;
  link: string;
  internal?: boolean;
  badge?: string;
}

const PROJECTS: Project[] = [
  {
    id: 1,
    title: "Multi-Agent RAG Application",
    description:
      "Dating Planner — Making use of Multi-Agent RAG to plan a date. Backend is in Python with FastAPI and Frontend is in React. OpenAI's LLM is used in conjunction with Pinecone and LangGraph. Project has been initially deployed to AWS using ECS and ECR.",
    stack: ["Python", "FastAPI", "React", "LangGraph", "Pinecone", "OpenAI", "AWS ECS/ECR"],
    image: "multi-agent.webp",
    link: "https://github.com/3-jobless-folks/dating-plan-ai-agents",
    badge: "AI · RAG",
  },
  {
    id: 2,
    title: "Speech-to-Text Application",
    description:
      "Audio Transcriber — Making use of OpenAI Whisper model to do translation to words. Backend is in Python with FastAPI and Frontend is in React. Project is containerized.",
    stack: ["Python", "FastAPI", "React", "OpenAI Whisper", "Docker"],
    image: "speech-to-text.webp",
    link: "https://github.com/randyharrogates/speech",
    badge: "AI · NLP",
  },
  {
    id: 3,
    title: "Fine-tuning of a Language Model",
    description:
      "Named Entity Recognition — Fine-tuned a BERT-based model from Huggingface to perform NER on medical data. Backend is in Python with FastAPI using a Kedro pipeline. Project is containerized.",
    stack: ["Python", "HuggingFace", "BERT", "FastAPI", "Kedro", "Docker"],
    image: "fine-tuning.png",
    link: "/fine-tuning",
    internal: true,
    badge: "AI · NER",
  },
  {
    id: 4,
    title: "Holiday Booking Application",
    description:
      "Web Application to book holidays — Created using JavaScript for frontend and Python with Flask for backend. Application can be used to book holidays and manage users.",
    stack: ["JavaScript", "Python", "Flask", "SQL"],
    image: "staycation2.webp",
    link: "https://github.com/randyharrogates/WebApp",
    badge: "Full-Stack",
  },
  {
    id: 5,
    title: "Ecommerce Webpage",
    description:
      "Web Page for shop — A simple webpage created to sell food products. Done using VueJS.",
    stack: ["VueJS", "HTML", "CSS"],
    image: "duck.webp",
    link: "https://github.com/sheppy9/vietMalaEatery",
    badge: "Frontend",
  },
  {
    id: 6,
    title: "HR Management System",
    description:
      "A simple HR Management System created using ReactJS and ExpressJS. Handles employee records and HR workflows.",
    stack: ["ReactJS", "ExpressJS", "NodeJS"],
    image: "hrm.webp",
    link: "https://github.com/randyharrogates/hrm",
    badge: "Full-Stack",
  },
];

const Projects: React.FC = () => {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="projects-wrap">
      <div className="prompt-line">
        <span className="prompt-path">~/portfolio</span>
        <span className="prompt-sep"> $ </span>
        <span className="prompt-cmd">ls -la projects/</span>
      </div>

      <div className="projects-grid">
        {PROJECTS.map((p) => (
          <div
            key={p.id}
            className={`project-card${expanded === p.id ? " project-card-expanded" : ""}`}
            onClick={() => setExpanded(expanded === p.id ? null : p.id)}
          >
            {/* Card header */}
            <div className="project-card-header">
              <div className="project-card-titlerow">
                <span className="project-num">{String(p.id).padStart(2, "0")}</span>
                <h3 className="project-title">{p.title}</h3>
                {p.badge && <span className="project-badge">{p.badge}</span>}
                <span className="project-toggle">{expanded === p.id ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* Card body — shown when expanded */}
            {expanded === p.id && (
              <div className="project-card-body">
                <div className="project-body-media">
                  <img
                    src={`${process.env.PUBLIC_URL}/${p.image}`}
                    alt={p.title}
                    className="project-img"
                  />
                </div>
                <div className="project-body-text">
                  <p className="project-desc">{p.description}</p>

                  {/* Tech stack */}
                  <div className="code-block">
                    <span className="cmt"># tech stack</span>
                    <br />
                    <span className="str">[</span>
                    {p.stack.map((s, i) => (
                      <span key={s}>
                        <span className="str">"{s}"</span>
                        {i < p.stack.length - 1 && <span className="cmd">, </span>}
                      </span>
                    ))}
                    <span className="str">]</span>
                  </div>

                  {/* Link */}
                  {p.internal ? (
                    <Link to={p.link} className="terminal-btn primary project-link" onClick={(e) => e.stopPropagation()}>
                      <span className="btn-prefix">$</span> view details
                    </Link>
                  ) : (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="terminal-btn primary project-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="btn-prefix">$</span> view on github
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Projects;

/** @format */

import React from "react";
import "./MultiAgentRag.css";

const MultiAgentRag: React.FC = () => {
  return (
    <div className="mar-wrap">
      <div className="mar-title-row">
        <span className="mar-num">03</span>
        <h2 className="mar-title">
          Multi-Agent <span className="hl-orange">RAG Orchestration</span> Platform
        </h2>
      </div>

      <hr className="terminal-divider" />

      <div className="mar-layout">
        <div className="mar-left">
          <img
            src={`${process.env.PUBLIC_URL}/multi-agent.webp`}
            alt="Multi-Agent RAG Orchestration Platform"
            className="mar-hero-img"
          />
          <div className="mar-actions">
            <a
              href="https://github.com/3-jobless-folks/dating-plan-ai-agents"
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-btn primary"
            >
              <span className="btn-prefix">$</span> view on github
            </a>
          </div>
        </div>

        <div className="mar-right">
          <div className="code-block">
            <span className="cmt"># tech stack</span>
            <br />
            <span className="key">backend</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Python · FastAPI"</span>
            <br />
            <span className="key">frontend</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"React"</span>
            <br />
            <span className="key">ai</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"LangGraph · OpenAI · Pinecone"</span>
            <br />
            <span className="key">infra</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"AWS ECS/ECR"</span>
          </div>

          <p className="mar-body">
            A <span className="hl-green">Multi-Agent RAG orchestration platform</span> demonstrating
            production-grade agent coordination patterns. Built as a reference architecture using{" "}
            <span className="hl-orange">LangGraph</span> to orchestrate multiple specialized AI agents
            that collaborate on complex planning tasks — venue discovery, activity recommendation, and
            itinerary optimization — applicable to enterprise use cases requiring multi-agent coordination.
          </p>

          <h4 className="mar-subheading">Architecture</h4>
          <p className="mar-body">
            The backend is built with <span className="hl-blue">FastAPI</span> and uses{" "}
            <span className="hl-orange">Pinecone</span> as the vector store for retrieval-augmented
            generation. Multiple specialized agents handle different aspects of date planning — venue
            discovery, activity suggestions, and itinerary optimization. The frontend is a{" "}
            <span className="hl-purple">React</span> application providing an interactive chat interface.
          </p>

          <h4 className="mar-subheading">Deployment</h4>
          <p className="mar-body">
            The project has been deployed to <span className="hl-green">AWS</span> using{" "}
            <span className="hl-blue">ECS</span> (Elastic Container Service) with container images stored
            in <span className="hl-blue">ECR</span> (Elastic Container Registry), enabling scalable and
            reliable production hosting.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MultiAgentRag;

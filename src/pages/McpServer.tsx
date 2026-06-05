/** @format */

import React from "react";
import "./McpServer.css";

const McpServer: React.FC = () => {
  return (
    <div className="mcp-wrap">
      <div className="mcp-title-row">
        <span className="mcp-num">11</span>
        <h2 className="mcp-title">
          Production <span className="hl-orange">MCP Server</span> for an Enterprise Platform
        </h2>
      </div>

      <hr className="terminal-divider" />

      {/* Tech stack */}
      <div className="code-block">
        <span className="cmt"># tech stack</span>
        <br />
        <span className="key">protocol</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"Model Context Protocol (MCP) — stdio + HTTP transports"</span>
        <br />
        <span className="key">auth</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"JWT + transparent re-auth + Redis session cache"</span>
        <br />
        <span className="key">tools</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"14+ domain groups · multipart uploads · binary downloads"</span>
        <br />
        <span className="key">backend</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"Python · FastAPI · Pydantic V2"</span>
        <br />
        <span className="key">infra</span>
        <span style={{ color: "#5a5450" }}>: </span>
        <span className="str">"Docker · containerized production deployment"</span>
      </div>

      {/* Architecture visual */}
      <div className="mcp-arch-block">
        <span className="cmt">$ mcp-server status</span>
        <br />
        <span className="hl-green">✓</span>{" "}
        <span>14 tool domains registered</span>
        <br />
        <span className="hl-green">✓</span>{" "}
        <span>JWT auth with transparent re-auth on token expiry</span>
        <br />
        <span className="hl-green">✓</span>{" "}
        <span>Session cache: hot sessions survive MCP reconnects</span>
        <br />
        <span className="hl-green">✓</span>{" "}
        <span>Multipart upload support for files up to 100 MB</span>
        <br />
        <span className="hl-green">✓</span>{" "}
        <span>Binary download streaming: PDFs, exports, reports</span>
        <br />
        <span className="hl-orange">i</span>{" "}
        <span style={{ color: "#5a5450" }}>Employer and product name withheld</span>
      </div>

      {/* Overview */}
      <p className="mcp-body">
        Designed and shipped a <span className="hl-green">production MCP server</span> that wraps
        the full API surface of an enterprise SaaS platform, exposing it as structured tools
        consumable by any MCP-compatible LLM client. At the time of launch, production MCP deployments
        were extremely rare; most engineers had only seen MCP in toy demos. This project covered
        the full gap from spec to production: auth lifecycle, session persistence, tool schema
        design at scale, and binary data transfer over a JSON-native protocol.
      </p>

      {/* Auth and sessions */}
      <h4 className="mcp-subheading">JWT Auth and Session Caching</h4>
      <p className="mcp-body">
        MCP connections can be long-lived (hours to days in agentic workflows), but JWTs expire on
        the order of minutes to hours. Naively forwarding a token means the session dies mid-task
        with a cryptic 401. The server handles this with{" "}
        <span className="hl-orange">transparent re-auth</span>: it intercepts 401 responses from
        the upstream platform, silently refreshes the token via the refresh flow, and retries the
        request before surfacing any error to the LLM. Sessions are cached in{" "}
        <span className="hl-blue">Redis</span> so reconnecting MCP clients do not trigger a fresh
        login on every attach.
      </p>

      {/* Tool schema design */}
      <h4 className="mcp-subheading">Tool Schema Design at Scale</h4>
      <p className="mcp-body">
        Exposing 14+ API domains as MCP tools requires deliberate naming and description strategy.
        LLMs select tools based on names and descriptions, not on implementation details. Over several
        iterations, the toolset was structured into{" "}
        <span className="hl-purple">domain-prefixed groups</span> (e.g.{" "}
        <span className="hl-orange">documents__list</span>,{" "}
        <span className="hl-orange">documents__upload</span>) with terse, action-oriented descriptions.
        Pydantic V2 models enforce typed inputs and outputs, and the server validates all payloads
        before forwarding to the platform API, so the LLM cannot produce malformed requests.
      </p>

      {/* Binary transfers */}
      <h4 className="mcp-subheading">Binary Transfers over MCP</h4>
      <p className="mcp-body">
        MCP is a JSON protocol; sending large files requires either{" "}
        <span className="hl-blue">base64 encoding in the message body</span> (simple but
        inflates payload size ~33%) or redirecting to a pre-signed URL (fewer round-trips but
        requires the caller to handle the download separately). Upload tools accept{" "}
        <span className="hl-green">multipart form data</span> via a small HTTP sidecar endpoint,
        returning a file ID that the MCP tool then passes to the platform. Download tools stream
        binary content and return it base64-encoded with the correct MIME type, so any MCP client
        can reconstruct the file without custom transport logic.
      </p>

      <div className="callout-box">
        <div className="callout-label">Why This Is Rare</div>
        <p>
          As of mid-2026, the vast majority of MCP integrations are read-only demos wrapping
          a handful of database queries. Building a server that handles stateful auth, large binary
          transfers, and 14+ tool domains at production reliability is a substantially different
          engineering problem. The lessons on transparent re-auth and binary transfer patterns
          are not covered in any MCP documentation and were worked out empirically.
        </p>
      </div>

      <div className="callout-box">
        <div className="callout-label">Confidentiality Notice</div>
        <p>
          This project was built for an employer's proprietary platform. Employer name, product
          name, and internal architecture details are withheld. The technical patterns described
          above are general and can be shared in full on request.
        </p>
      </div>

      <div className="mcp-actions">
        <a href="mailto:randychan_92@outlook.com" className="terminal-btn primary">
          <span className="btn-prefix">$</span> request more information
        </a>
      </div>
    </div>
  );
};

export default McpServer;

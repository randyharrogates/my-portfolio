/** @format */

import React from "react";
import { HashRouter as Router, Route, Routes, Link } from "react-router-dom";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css"; // Import Bootstrap Icons

import AboutMe from "./pages/AboutMe.tsx"; // AboutMe component import
import FineTuning from "./pages/FineTuning.tsx";

const App: React.FC = () => {
	return (
		<Router>
			<div>
				<nav className="navbar navbar-expand-lg navbar-dark bg-dark">
					<div className="container-fluid">
						<Link className="navbar-brand" to="/">
							<i className="bi-house-door me-2"></i> My Portfolio
						</Link>
						<button
							className="navbar-toggler"
							type="button"
							data-bs-toggle="collapse"
							data-bs-target="#navbarNav"
							aria-controls="navbarNav"
							aria-expanded="false"
							aria-label="Toggle navigation"
						>
							<span className="navbar-toggler-icon"></span>
						</button>
						<div className="collapse navbar-collapse" id="navbarNav">
							<ul className="navbar-nav">
								<li className="nav-item">
									<Link className="nav-link" to="/">
										<i className="bi-house-door me-2"></i> About Me
									</Link>
								</li>
								<li className="nav-item">
									<a className="nav-link" href="https://github.com/3-jobless-folks/dating-plan-ai-agents" target="_blank" rel="noopener noreferrer">
										<i className="bi-gear me-2"></i> Multi-Agent RAG
									</a>
								</li>
								<li className="nav-item">
									<a className="nav-link" href="https://github.com/randyharrogates/speech" target="_blank" rel="noopener noreferrer">
										<i className="bi-mic me-2"></i> Speech-To-Text
									</a>
								</li>
								<li className="nav-item">
									<Link className="nav-link" to="/fine-tuning">
										<i className="bi-wrench me-2"></i> Fine-Tuning
									</Link>
								</li>
								<li className="nav-item">
									<a className="nav-link" href="https://github.com/randyharrogates/WebApp" target="_blank" rel="noopener noreferrer">
										<i className="bi-code-slash me-2"></i> Web App
									</a>
								</li>
								<li className="nav-item">
									<a className="nav-link" href="https://github.com/sheppy9/vietMalaEatery" target="_blank" rel="noopener noreferrer">
										<i className="bi bi-file-earmark-fill"></i> Web Page
									</a>
								</li>
							</ul>
						</div>
					</div>
				</nav>
				<div className="container mt-4">
					<Routes>
						<Route path="/" element={<AboutMe />} />
						<Route path="/fine-tuning" element={<FineTuning />} />
					</Routes>
				</div>
			</div>
		</Router>
	);
};

export default App;

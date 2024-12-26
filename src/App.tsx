/** @format */

import React from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css"; // Import Bootstrap Icons

import AboutMe from "./pages/AboutMe.tsx";
import Project1 from "./pages/Project1.tsx";
import Project2 from "./pages/Project2.tsx";
import Project3 from "./pages/Project3.tsx";
import Project4 from "./pages/Project4.tsx";
import Project5 from "./pages/Project5.tsx";

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
									<Link className="nav-link" to="/project1">
										<i className="bi-gear me-2"></i> Multi-Agent RAG
									</Link>
								</li>
								<li className="nav-item">
									<Link className="nav-link" to="/project2">
										<i className="bi-mic me-2"></i> Speech-To-Text
									</Link>
								</li>
								<li className="nav-item">
									<Link className="nav-link" to="/project3">
										<i className="bi-wrench me-2"></i> Fine-Tuning
									</Link>
								</li>
								<li className="nav-item">
									<Link className="nav-link" to="/project4">
										<i className="bi-code-slash me-2"></i> Web App
									</Link>
								</li>
								<li className="nav-item">
									<Link className="nav-link" to="/project5">
										<i className="bi bi-file-earmark-fill"></i> Web Page
									</Link>
								</li>
							</ul>
						</div>
					</div>
				</nav>
				<div className="container mt-4">
					<Routes>
						<Route path="/" element={<AboutMe />} />
						<Route path="/project1" element={<Project1 />} />
						<Route path="/project2" element={<Project2 />} />
						<Route path="/project3" element={<Project3 />} />
						<Route path="/project4" element={<Project4 />} />
						<Route path="/project5" element={<Project5 />} />
					</Routes>
				</div>
			</div>
		</Router>
	);
};

export default App;

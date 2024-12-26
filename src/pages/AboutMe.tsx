/** @format */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // Import Link for routing
import "bootstrap-icons/font/bootstrap-icons.css";

const AboutMe: React.FC = () => {
	const [profileData, setProfileData] = useState<any>(null);

	useEffect(() => {
		// GitHub API call to fetch GitHub profile info
		fetch("https://api.github.com/users/randyharrogates")
			.then((response) => response.json())
			.then((data) => setProfileData((prev) => ({ ...prev, github: data })));
	}, []);

	if (!profileData) return <div className="text-center">Loading...</div>;

	return (
		<div className="container py-5">
			{/* About Me Section */}
			<div className="row justify-content-center">
				<div className="col-lg-6 col-md-8 col-sm-12">
					<div className="card shadow-lg border-0 rounded">
						<div className="card-body text-center">
							{/* Profile Header */}
							<h2 className="card-title mb-3">About Me</h2>
							<img src={profileData.github?.avatar_url} alt="GitHub Avatar" className="img-fluid rounded-circle mb-3" style={{ width: "150px", height: "150px" }} />
							<h4 className="card-subtitle mb-2 text-muted">{"Randy Chan"}</h4>
							<p className="card-text">
								A passionate Full-Stack AI engineer with 4 years of experience in designing and deploying end-to-end software applications, specializing in natural language processing
								and large language models (LLMs) as well as micro-services and web applications. Proficient in both Python and Java and focused on tackling industry challenges with
								cutting-edge, state-of-the-art solutions. I excel at researching innovative approaches to solve new project challenges. I thrive in open, collaborative environments
								that foster knowledge sharing and continuous growth. I am always eager to leverage my expertise in AI software development to drive impactful solutions in dynamic,
								forward-thinking teams.
							</p>
							<p className="card-text">Take a look at some of my notable projects below.</p>
							{/* Email Section */}
							<div className="mb-3">
								<a href="mailto:randychan_92@outlook.com" className="btn btn-outline-secondary">
									<i className="bi bi-envelope me-2"></i> Email Me
								</a>
							</div>
							{/* GitHub Link */}
							<a href={profileData.github?.html_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-dark mb-3">
								Visit my GitHub
							</a>

							{/* LinkedIn Button */}
							<div>
								<a href="https://www.linkedin.com/in/randychan112" target="_blank" rel="noopener noreferrer">
									<button className="btn btn-primary btn-lg">Visit my LinkedIn</button>
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Skills Section */}
			<div className="row mt-5">
				<div className="row justify-content-center">
					<div className="col-6">
						<div className="card shadow-lg border-0 rounded">
							<div className="card-body">
								<h3 className="card-title text-center mb-4">Skills</h3>
								<div className="row">
									<div className="col-12 mb-4">
										<div className="card bg-secondary text-light border-0 shadow-sm" style={{ minHeight: "70px" }}>
											<div className="card-body d-flex flex-column justify-content-center text-center">
												<h5 className="card-title">
													<i className="bi bi-code-slash me-2"></i>Languages
												</h5>
												<ul className="list-unstyled">
													<li>Python | Java | HTML | CSS | JavaScript | TypeScript | Bash</li>
												</ul>
											</div>
										</div>
									</div>
									<div className="col-12 mb-4">
										<div className="card bg-secondary text-light border-0 shadow-sm" style={{ minHeight: "70px" }}>
											<div className="card-body d-flex flex-column justify-content-center text-center">
												<h5 className="card-title">
													<i className="bi bi-braces me-2"></i>AI & ML
												</h5>
												<ul className="list-unstyled">
													<li>OpenAI | LangGraph | Kedro | Pytorch | Huggingface | LangChain | NLTK</li>
												</ul>
											</div>
										</div>
									</div>
									<div className="col-12 mb-4">
										<div className="card bg-secondary text-light border-0 shadow-sm" style={{ minHeight: "70px" }}>
											<div className="card-body d-flex flex-column justify-content-center text-center">
												<h5 className="card-title">
													<i className="bi bi-brush me-2"></i>Frontend
												</h5>
												<ul className="list-unstyled">
													<li>ReactJS | VueJS</li>
												</ul>
											</div>
										</div>
									</div>
									<div className="col-12 mb-4">
										<div className="card bg-secondary text-light border-0 shadow-sm" style={{ minHeight: "70px" }}>
											<div className="card-body d-flex flex-column justify-content-center text-center">
												<h5 className="card-title">
													<i className="bi bi-terminal me-2"></i>Backend
												</h5>
												<ul className="list-unstyled">
													<li>Springboot | Flask | FastAPI | JQuery</li>
												</ul>
											</div>
										</div>
									</div>
									<div className="col-12 mb-4">
										<div className="card bg-secondary text-light border-0 shadow-sm" style={{ minHeight: "70px" }}>
											<div className="card-body d-flex flex-column justify-content-center text-center">
												<h5 className="card-title">
													<i className="bi bi-laptop me-2"></i>OS
												</h5>
												<ul className="list-unstyled">
													<li>Windows | Ubuntu | Linux | MacOS</li>
												</ul>
											</div>
										</div>
									</div>
									<div className="col-12 mb-4">
										<div className="card bg-secondary text-light border-0 shadow-sm" style={{ minHeight: "70px" }}>
											<div className="card-body d-flex flex-column justify-content-center text-center">
												<h5 className="card-title">
													<i className="bi bi-cloud me-2"></i>Cloud
												</h5>
												<ul className="list-unstyled">
													<li>Docker | Kubernetes | AWS</li>
												</ul>
											</div>
										</div>
									</div>
									<div className="col-12 mb-4">
										<div className="card bg-secondary text-light border-0 shadow-sm" style={{ minHeight: "70px" }}>
											<div className="card-body d-flex flex-column justify-content-center text-center">
												<h5 className="card-title">
													<i className="bi bi-database me-2"></i>Databases
												</h5>
												<ul className="list-unstyled">
													<li>SQL Server | MySQL | PostgreSQL | MongoDB | ChromaDB | Pinecone</li>
												</ul>
											</div>
										</div>
									</div>
									<div className="col-12 mb-4">
										<div className="card bg-secondary text-light border-0 shadow-sm" style={{ minHeight: "70px" }}>
											<div className="card-body d-flex flex-column justify-content-center text-center">
												<h5 className="card-title">
													<i className="bi bi-hdd-rack me-2"></i>Experiments
												</h5>
												<ul className="list-unstyled">
													<li>Coder | RunAI</li>
												</ul>
											</div>
										</div>
									</div>
									<div className="col-12 mb-4">
										<div className="card bg-secondary text-light border-0 shadow-sm" style={{ minHeight: "70px" }}>
											<div className="card-body d-flex flex-column justify-content-center text-center">
												<h5 className="card-title">
													<i className="bi bi-git me-2"></i>CI / CD
												</h5>
												<ul className="list-unstyled">
													<li>GitHub Actions | GitLab CI | Jenkins</li>
												</ul>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Project Previews Section */}
			<div className="row mt-5">
				{/* Adjusted Column for Consistent Width */}
				<div className="col-md-6 mb-4">
					<div className="card shadow-sm border-0 rounded" style={{ minHeight: "600px" }}>
						<img src={`${process.env.PUBLIC_URL}/multi-agent.webp`} alt="Multi-Agent RAG application" className="card-img-top" />
						<div className="card-body">
							<h5 className="card-title">Multi-Agent RAG application</h5>
							<p className="card-text">
								Dating Planner - Making use of Multi-Agent RAG to plan a date. Backend is in python with FastAPI and Frontend is in React. OpenAI's LLM is used here in conjunction with
								Pinecone and LangGraph. Project has been initially deployed to AWS using ECS and ECR.
							</p>
							<Link to="/project1" className="btn btn-primary">
								View Project
							</Link>
						</div>
					</div>
				</div>
				<div className="col-md-6 mb-4">
					<div className="card shadow-sm border-0 rounded" style={{ minHeight: "600px" }}>
						<img src={`${process.env.PUBLIC_URL}/speech-to-text.webp`} alt="Speech-to-text application" className="card-img-top" />
						<div className="card-body">
							<h5 className="card-title">Speech-to-text Application</h5>
							<p className="card-text">
								Audio Transcriber - Making use of openAI whisper model to do translation to words. Backend is in python with FastAPI and Frontend is in React. Project is containerized.
							</p>
							<Link to="/project2" className="btn btn-primary">
								View Project
							</Link>
						</div>
					</div>
				</div>
				<div className="col-md-6 mb-4">
					<div className="card shadow-sm border-0 rounded" style={{ minHeight: "600px" }}>
						<img src={`${process.env.PUBLIC_URL}/fine-tuning.png`} alt="Fine-tuning of a language model" className="card-img-top" />
						<div className="card-body">
							<h5 className="card-title">Fine-tuning of a language model</h5>
							<p className="card-text">
								Named Entity Recognition - Fine-tuned a BERT based model from Huggingface to do named entity recognition on medical data. Backend is in python with FastAPI making of of
								kedro pipeline. Project is containerized.
							</p>
							<Link to="/project3" className="btn btn-primary">
								View Project
							</Link>
						</div>
					</div>
				</div>
				<div className="col-md-6 mb-4">
					<div className="card shadow-sm border-0 rounded" style={{ minHeight: "600px" }}>
						<img src={`${process.env.PUBLIC_URL}/staycation2.webp`} alt="Staycation application" className="card-img-top" />
						<div className="card-body">
							<h5 className="card-title">Holiday Booking Application</h5>
							<p className="card-text">
								Web Application to book holidays - Application is created using javascript for frontend and python with Flask for backend. Application can be used to book holidays and
								manage users.
							</p>
							<Link to="/project3" className="btn btn-primary">
								View Project
							</Link>
						</div>
					</div>
				</div>
				<div className="col-md-6 mb-4">
					<div className="card shadow-sm border-0 rounded" style={{ minHeight: "600px" }}>
						<img src={`${process.env.PUBLIC_URL}/duck.webp`} alt="Ecommerce webpage" className="card-img-top" />
						<div className="card-body">
							<h5 className="card-title">Ecommerce webpage</h5>
							<p className="card-text">Web Page for shop - A simple webpage created to sell food products. Done using VueJS</p>
							<Link to="/project3" className="btn btn-primary">
								View Project
							</Link>
						</div>
					</div>
				</div>

				{/* More Project Cards */}
				{/* Add Project 2, 3, 4, 5 as before */}
			</div>
		</div>
	);
};

export default AboutMe;

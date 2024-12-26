/** @format */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // Import Link for routing
import "bootstrap-icons/font/bootstrap-icons.css";
import "./AboutMe.css"; // Import custom CSS for extra styling

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
				<div className="col-lg-6 col-md-8 col-sm-12 text-center">
					<h2 className="mb-3">About Me</h2>
					<img src={profileData.github?.avatar_url} alt="GitHub Avatar" className="img-fluid rounded-circle mb-3" style={{ width: "150px", height: "150px" }} />
					<h4 className="mb-2 text-muted">{"Randy Chan"}</h4>
					<p className="text-muted">Full-Stack AI engineer | 4 YOE | NLP | LLM</p>
					<p>
						Proficient in both Python, Java and Javascript. Focused on tackling industry challenges with cutting-edge, state-of-the-art solutions. I excel at researching innovative
						approaches to solve new project challenges. I thrive in open, collaborative environments that foster knowledge sharing and continuous growth.
					</p>
					<p>Take a look at some of my notable projects below.</p>
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

			{/* Skills Section */}
			<div className="row mt-5 justify-content-center">
				{/* Use Bootstrap grid and custom CSS for organization */}
				<div className="col-12 col-md-6 col-lg-4 skill-card">
					<h5>Languages</h5>
					<ul>
						<li>Python | Java | HTML | CSS | JavaScript | TypeScript | Bash</li>
					</ul>
				</div>
				<div className="col-12 col-md-6 col-lg-4 skill-card">
					<h5>AI & ML</h5>
					<ul>
						<li>OpenAI | LangGraph | Kedro | Pytorch | Huggingface | LangChain | NLTK</li>
					</ul>
				</div>
				<div className="col-12 col-md-6 col-lg-4 skill-card">
					<h5>Frontend</h5>
					<ul>
						<li>ReactJS | VueJS</li>
					</ul>
				</div>
				<div className="col-12 col-md-6 col-lg-4 skill-card">
					<h5>Backend</h5>
					<ul>
						<li>Springboot | Flask | FastAPI | JQuery</li>
					</ul>
				</div>
				<div className="col-12 col-md-6 col-lg-4 skill-card">
					<h5>OS</h5>
					<ul>
						<li>Windows | Ubuntu | Linux | MacOS</li>
					</ul>
				</div>
				<div className="col-12 col-md-6 col-lg-4 skill-card">
					<h5>Cloud</h5>
					<ul>
						<li>Docker | Kubernetes | AWS</li>
					</ul>
				</div>
				<div className="col-12 col-md-6 col-lg-4 skill-card">
					<h5>Databases</h5>
					<ul>
						<li>SQL Server | MySQL | PostgreSQL | MongoDB | ChromaDB | Pinecone</li>
					</ul>
				</div>
				<div className="col-12 col-md-6 col-lg-4 skill-card">
					<h5>Experiments</h5>
					<ul>
						<li>Coder | RunAI</li>
					</ul>
				</div>
				<div className="col-12 col-md-6 col-lg-4 skill-card">
					<h5>CI / CD</h5>
					<ul>
						<li>GitHub Actions | GitLab CI | Jenkins</li>
					</ul>
				</div>
			</div>

			{/* Project Previews Section */}
			<div className="row mt-5 justify-content-center">
				<div className="col-md-6 mb-4">
					<div className="card shadow-sm border-0 rounded">
						<img src={`${process.env.PUBLIC_URL}/multi-agent.webp`} alt="Multi-Agent RAG application" className="card-img-top" />
						<div className="card-body">
							<h5 className="card-title">Multi-Agent RAG application</h5>
							<p className="card-text">
								Dating Planner - Making use of Multi-Agent RAG to plan a date. Backend is in python with FastAPI and Frontend is in React. OpenAI's LLM is used here in conjunction with
								Pinecone and LangGraph. Project has been initially deployed to AWS using ECS and ECR.
							</p>
							<Link to="https://github.com/3-jobless-folks/dating-plan-ai-agents" className="btn btn-primary">
								View Project
							</Link>
						</div>
					</div>
				</div>
				<div className="col-md-6 mb-4">
					<div className="card shadow-sm border-0 rounded">
						<img src={`${process.env.PUBLIC_URL}/speech-to-text.webp`} alt="Speech-to-text application" className="card-img-top" />
						<div className="card-body">
							<h5 className="card-title">Speech-to-text Application</h5>
							<p className="card-text">
								Audio Transcriber - Making use of openAI whisper model to do translation to words. Backend is in python with FastAPI and Frontend is in React. Project is containerized.
							</p>
							<Link to="https://github.com/randyharrogates/speech" className="btn btn-primary">
								View Project
							</Link>
						</div>
					</div>
				</div>
				<div className="col-md-6 mb-4">
					<div className="card shadow-sm border-0 rounded">
						<img src={`${process.env.PUBLIC_URL}/fine-tuning.png`} alt="Fine-tuning of a language model" className="card-img-top" />
						<div className="card-body">
							<h5 className="card-title">Fine-tuning of a language model</h5>
							<p className="card-text">
								Named Entity Recognition - Fine-tuned a BERT-based model from Huggingface to do named entity recognition on medical data. Backend is in python with FastAPI making use
								of a kedro pipeline. Project is containerized.
							</p>
							<Link to="/fine-tuning" className="btn btn-primary">
								View Project
							</Link>
						</div>
					</div>
				</div>
				<div className="col-md-6 mb-4">
					<div className="card shadow-sm border-0 rounded">
						<img src={`${process.env.PUBLIC_URL}/staycation2.webp`} alt="Staycation application" className="card-img-top" />
						<div className="card-body">
							<h5 className="card-title">Holiday Booking Application</h5>
							<p className="card-text">
								Web Application to book holidays - Application is created using JavaScript for frontend and Python with Flask for backend. Application can be used to book holidays and
								manage users.
							</p>
							<Link to="https://github.com/randyharrogates/WebApp" className="btn btn-primary">
								View Project
							</Link>
						</div>
					</div>
				</div>
				<div className="col-md-6 mb-4">
					<div className="card shadow-sm border-0 rounded">
						<img src={`${process.env.PUBLIC_URL}/duck.webp`} alt="Ecommerce webpage" className="card-img-top" />
						<div className="card-body">
							<h5 className="card-title">Ecommerce webpage</h5>
							<p className="card-text">Web Page for shop - A simple webpage created to sell food products. Done using VueJS.</p>
							<Link to="https://github.com/sheppy9/vietMalaEatery" className="btn btn-primary">
								View Project
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AboutMe;

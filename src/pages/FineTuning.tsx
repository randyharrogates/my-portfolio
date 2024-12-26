/** @format */

import React from "react";
import { Link } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css"; // Ensure Bootstrap Icons are imported
import "./FineTuning.css"; // Create a CSS file for any styling you want to add

const FineTuning: React.FC = () => {
	return (
		<div className="container mt-5">
			<div className="row">
				<div className="col-md-12 text-center">
					{/* Project Image */}
					<img
						src={`${process.env.PUBLIC_URL}/fine-tuning.png`} // Add the correct path for the image
						alt="Fine-Tuning Project"
						className="img-fluid rounded mb-4"
						style={{ maxWidth: "600px" }}
					/>
					{/* Project Title */}
					<h2>
						<i className="bi bi-magic me-2"></i> Fine-Tuning of a BERT-based Model for NER on Medical Data
					</h2>
					{/* Project Description */}
					<p className="lead">
						<i className="bi bi-file-earmark-text me-2"></i>
						This project involved fine-tuning a BERT-based model, specifically designed for medical data, to perform Named Entity Recognition (NER). The task focused on identifying medical
						entities such as diseases, treatments, and medications within clinical notes. The fine-tuning process was carried out using FastAPI as the backend and was deployed within a
						Kedro pipeline.
					</p>
					{/* More Project Details */}
					<h4>
						<i className="bi bi-cogs me-2"></i> Enhanced with Retrieval-Augmented Generation (RAG)
					</h4>
					<p>
						<i className="bi bi-lightbulb me-2"></i>
						In addition to fine-tuning the BERT-based model, we employed Retrieval-Augmented Generation (RAG) to improve the model’s performance in identifying and understanding more
						complex medical terms. RAG, when combined with LLMs, allows the system to leverage external knowledge sources (such as clinical literature) during the inference process. This
						combination has significantly enhanced the accuracy and efficiency of Named Entity Recognition (NER) within medical texts.
					</p>
					{/* Project Details */}
					<h4>
						<i className="bi bi-info-circle me-2"></i> About the Project
					</h4>
					<p>
						<i className="bi bi-shield-lock me-2"></i>
						Unfortunately, due to privacy and data confidentiality concerns, this project cannot be publicly demonstrated. However, a detailed explanation of the project can be shared upon
						request, including the methodology used, the challenges encountered, and the results obtained. Feel free to contact me for more information or if you would like a deeper dive
						into the project bearing what can be shared!
					</p>
					{/* Contact/Request More Info */}
					<Link
						to="mailto:randychan_92@outlook.com" // Correct mailto link format
						className="btn btn-primary"
					>
						<i className="bi bi-envelope me-2"></i> Request More Information
					</Link>
				</div>
			</div>
		</div>
	);
};

export default FineTuning;

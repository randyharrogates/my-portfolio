/** @format */

import React from "react";
import { BrowserRouter as Router, Route, Switch, Link } from "react-router-dom";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";

import AboutMe from "./pages/AboutMe.tsx";
import Project1 from "./pages/Project1";
import Project2 from "./pages/Project2";
import Project3 from "./pages/Project3";
import Project4 from "./pages/Project4";
import Project5 from "./pages/Project5";

const App: React.FC = () => {
	return (
		<Router>
			<div>
				<nav className="navbar navbar-expand-lg navbar-dark bg-dark">
					<div className="container-fluid">
						<Link className="navbar-brand" to="/">
							My Portfolio
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
										About Me
									</Link>
								</li>
								<li className="nav-item">
									<Link className="nav-link" to="/project1">
										Project 1
									</Link>
								</li>
								<li className="nav-item">
									<Link className="nav-link" to="/project2">
										Project 2
									</Link>
								</li>
								<li className="nav-item">
									<Link className="nav-link" to="/project3">
										Project 3
									</Link>
								</li>
								<li className="nav-item">
									<Link className="nav-link" to="/project4">
										Project 4
									</Link>
								</li>
								<li className="nav-item">
									<Link className="nav-link" to="/project5">
										Project 5
									</Link>
								</li>
							</ul>
						</div>
					</div>
				</nav>
				<div className="container mt-4">
					<Switch>
						<Route exact path="/" component={AboutMe} />
						<Route path="/project1" component={Project1} />
						<Route path="/project2" component={Project2} />
						<Route path="/project3" component={Project3} />
						<Route path="/project4" component={Project4} />
						<Route path="/project5" component={Project5} />
					</Switch>
				</div>
			</div>
		</Router>
	);
};

export default App;

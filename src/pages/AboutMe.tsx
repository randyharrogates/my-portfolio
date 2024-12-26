/** @format */

import React, { useEffect, useState } from "react";

const AboutMe: React.FC = () => {
	const [profileData, setProfileData] = useState<any>(null);

	useEffect(() => {
		// LinkedIn API call to fetch profile info
		// Example: Use LinkedIn API (you need to set up OAuth for LinkedIn)
		fetch("https://api.linkedin.com/v2/me", {
			headers: {
				Authorization: `Bearer <Your-Access-Token>`,
			},
		})
			.then((response) => response.json())
			.then((data) => setProfileData(data));

		// GitHub API call to fetch GitHub profile info
		fetch("https://api.github.com/users/<Your-GitHub-Username>")
			.then((response) => response.json())
			.then((data) => setProfileData((prev) => ({ ...prev, github: data })));
	}, []);

	if (!profileData) return <div>Loading...</div>;

	return (
		<div>
			<h1>About Me</h1>
			<p>Name: {profileData.firstName}</p>
			<p>Bio: {profileData.github?.bio}</p>
			<a href={profileData.github?.html_url} target="_blank" rel="noopener noreferrer">
				Visit my GitHub
			</a>
		</div>
	);
};

export default AboutMe;

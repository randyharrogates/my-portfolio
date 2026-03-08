/** @format */

import React from "react";
import "./HolidayBooking.css";

const HolidayBooking: React.FC = () => {
  return (
    <div className="hb-wrap">
      <div className="hb-title-row">
        <span className="hb-num">06</span>
        <h2 className="hb-title">
          <span className="hl-orange">Holiday Booking</span> Application
        </h2>
      </div>

      <hr className="terminal-divider" />

      <div className="hb-layout">
        <div className="hb-left">
          <img
            src={`${process.env.PUBLIC_URL}/staycation2.webp`}
            alt="Holiday Booking Application"
            className="hb-hero-img"
          />
          <div className="hb-actions">
            <a
              href="https://github.com/randyharrogates/WebApp"
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-btn primary"
            >
              <span className="btn-prefix">$</span> view on github
            </a>
          </div>
        </div>

        <div className="hb-right">
          <div className="code-block">
            <span className="cmt"># tech stack</span>
            <br />
            <span className="key">backend</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"Python · Flask"</span>
            <br />
            <span className="key">frontend</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"JavaScript"</span>
            <br />
            <span className="key">database</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"SQL"</span>
          </div>

          <p className="hb-body">
            A full-stack web application for booking holidays and managing travel reservations.
            Built with <span className="hl-blue">Flask</span> on the backend and{" "}
            <span className="hl-orange">JavaScript</span> on the frontend, providing a complete
            booking workflow from search to confirmation.
          </p>

          <h4 className="hb-subheading">Features</h4>
          <p className="hb-body">
            The application supports <span className="hl-green">user management</span> with
            registration and authentication, holiday package browsing with filtering,{" "}
            <span className="hl-purple">booking management</span> with date selection and
            availability checking, and an admin interface for managing listings and users.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HolidayBooking;

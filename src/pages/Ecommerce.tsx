/** @format */

import React from "react";
import "./Ecommerce.css";

const Ecommerce: React.FC = () => {
  return (
    <div className="ec-wrap">
      <div className="ec-title-row">
        <span className="ec-num">07</span>
        <h2 className="ec-title">
          <span className="hl-orange">VietMala Eatery</span> Food Shop
        </h2>
      </div>

      <hr className="terminal-divider" />

      <div className="ec-layout">
        <div className="ec-left">
          <img
            src={`${process.env.PUBLIC_URL}/duck.webp`}
            alt="VietMala Eatery"
            className="ec-hero-img"
          />
          <div className="ec-actions">
            <a
              href="https://github.com/sheppy9/vietMalaEatery"
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-btn primary"
            >
              <span className="btn-prefix">$</span> view on github
            </a>
          </div>
        </div>

        <div className="ec-right">
          <div className="code-block">
            <span className="cmt"># tech stack</span>
            <br />
            <span className="key">frontend</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"VueJS"</span>
            <br />
            <span className="key">styling</span>
            <span style={{ color: "#5a5450" }}>: </span>
            <span className="str">"HTML · CSS"</span>
          </div>

          <p className="ec-body">
            A static frontend webpage built for <span className="hl-green">VietMala Eatery</span>,
            a food shop selling Vietnamese and Malaysian cuisine. Created with{" "}
            <span className="hl-orange">VueJS</span> to provide a clean, responsive product
            showcase and ordering interface.
          </p>

          <h4 className="ec-subheading">Design</h4>
          <p className="ec-body">
            The site features a <span className="hl-blue">responsive layout</span> with product
            listings, menu categories, and an intuitive browsing experience optimized for both
            desktop and mobile users.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Ecommerce;

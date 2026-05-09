/** @format */

import React from "react";
import "./ArchitectureDiagram.css";

interface ArchitectureDiagramProps {
  children: React.ReactNode;
  ariaLabel: string;
  caption?: string;
}

const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({
  children,
  ariaLabel,
  caption,
}) => (
  <figure className="architecture-diagram" aria-label={ariaLabel}>
    <div className="architecture-diagram-scroll">{children}</div>
    {caption && <figcaption className="architecture-diagram-caption">{caption}</figcaption>}
  </figure>
);

export default ArchitectureDiagram;

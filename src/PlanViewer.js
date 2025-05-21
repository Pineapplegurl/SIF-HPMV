import React from 'react';
import './PlanViewer.css';

const PlanViewer = ({ imageOptions }) => {
  const selectedPlan = imageOptions[0]; // par défaut, première image

  return (
    <div className="plan-scroll-container">
      <div className="image-wrapper">
        <img
          src={selectedPlan.src}
          alt={selectedPlan.label}
          className="plan-full-image"
        />
      </div>
    </div>
  );
};

export default PlanViewer;
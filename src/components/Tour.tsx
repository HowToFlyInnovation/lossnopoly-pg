// src/components/Tour.tsx
import React, { useState, useEffect, useCallback } from "react";
import type { TourStep } from "../lib/tourSteps";

interface TourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

const Tour: React.FC<TourProps> = ({ steps, isOpen, onClose, onNavigate }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });

  const step = steps[currentStepIndex];

  const updatePosition = useCallback(() => {
    const targetElement = document.querySelector(step.selector);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
  }, [step.selector]);

  useEffect(() => {
    if (!isOpen) return;

    const targetElement = document.querySelector(step.selector);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }

    const timer = setTimeout(updatePosition, 150);

    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [currentStepIndex, isOpen, updatePosition]);

  if (!isOpen) {
    return null;
  }

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextStep = steps[currentStepIndex + 1];
      if (nextStep.path && nextStep.path !== step.path) {
        onNavigate(nextStep.path);
      }
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevStep = steps[currentStepIndex - 1];
      if (prevStep.path && prevStep.path !== step.path) {
        onNavigate(prevStep.path);
      }
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // New handler to restart the tour
  const handleRestart = () => {
    const firstStep = steps[0];
    if (firstStep.path && firstStep.path !== step.path) {
      onNavigate(firstStep.path);
    }
    setCurrentStepIndex(0);
  };

  const targetElement = document.querySelector(step.selector);

  const getCardPosition = () => {
    if (!targetElement)
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const cardWidth = 320;
    const cardHeight = 200;
    const margin = 15;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    let top = position.top + position.height + margin;
    let left = position.left;
    if (top + cardHeight > screenHeight)
      top = position.top - cardHeight - margin;
    if (top < margin) top = margin;
    if (left + cardWidth > screenWidth) left = screenWidth - cardWidth - margin;
    if (left < margin) left = margin;
    return { top: `${top}px`, left: `${left}px`, width: `${cardWidth}px` };
  };

  const cardContent = (
    <>
      <h3 className="text-lg font-bold mb-2">{step.title}</h3>
      <p className="text-sm mb-4">{step.content}</p>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-x-4">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white"
          >
            Stop
          </button>
          {/* Show Restart button only after the first step */}
          {currentStepIndex > 0 && (
            <button
              onClick={handleRestart}
              className="text-sm text-gray-400 hover:text-white"
            >
              Restart
            </button>
          )}
        </div>
        <div>
          {currentStepIndex > 0 && (
            <button
              onClick={handlePrev}
              className="text-sm px-3 py-1 mr-2 bg-gray-600 rounded hover:bg-gray-500"
            >
              Previous
            </button>
          )}
          <button
            onClick={handleNext}
            className="text-sm px-3 py-1 bg-blue-600 rounded hover:bg-blue-500"
          >
            {currentStepIndex === steps.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
      <div className="text-center mt-2 text-xs text-gray-500">
        Step {currentStepIndex + 1} of {steps.length}
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {targetElement ? (
        <>
          <div
            className="absolute rounded-md transition-all duration-300 ease-in-out"
            style={{
              top: `${position.top - 5}px`,
              left: `${position.left - 5}px`,
              width: `${position.width + 10}px`,
              height: `${position.height + 10}px`,
              boxShadow: "0 0 0 5000px rgba(0, 0, 0, 0.65)",
            }}
          ></div>
          <div
            className="absolute bg-gray-800 text-white p-4 rounded-lg shadow-xl pointer-events-auto transition-all duration-300 ease-in-out"
            style={getCardPosition()}
          >
            {cardContent}
          </div>
        </>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-auto"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.65)" }}
        >
          <div className="bg-gray-800 text-white p-4 rounded-lg shadow-xl w-80 relative">
            {cardContent}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tour;

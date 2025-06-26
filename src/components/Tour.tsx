import React, { useState, useEffect, useCallback, useRef } from "react";
import type { TourStep } from "../lib/tourSteps";

interface TourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  setMenuActive: (active: boolean) => void;
}

const Tour: React.FC<TourProps> = ({
  steps,
  isOpen,
  onClose,
  onNavigate,
  setMenuActive,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });
  const [isTransitioning, setIsTransitioning] = useState(true); // Start as true to hide on initial load

  const step = steps[currentStepIndex];
  const tourCardRef = useRef<HTMLDivElement>(null); // Ref for the tour card

  const calculatePosition = useCallback(() => {
    const targetElement = document.querySelector(step.selector);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      return true;
    }
    // Handle selector not found (for body-centered steps)
    setPosition({
      top: window.innerHeight / 2,
      left: window.innerWidth / 2,
      width: 0,
      height: 0,
    });
    return false;
  }, [step.selector]);

  useEffect(() => {
    if (!isOpen) return;

    setIsTransitioning(true); // Always hide during setup

    if (step.menuState === "open") setMenuActive(true);
    else if (step.menuState === "closed") setMenuActive(false);

    // Delay allows for screen transitions and menu animations
    const setupTimer = setTimeout(() => {
      const targetFound = calculatePosition();

      if (targetFound) {
        const targetElement = document.querySelector(step.selector);
        targetElement?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }

      // Allow a moment for scrolling to finish, then reveal the step
      const revealTimer = setTimeout(() => {
        calculatePosition(); // Recalculate after scroll
        setIsTransitioning(false); // Fade in
      }, 300); // This delay ensures scrolling is complete

      return () => clearTimeout(revealTimer);
    }, 200); // Initial delay for page load

    window.addEventListener("resize", calculatePosition);
    document.addEventListener("scroll", calculatePosition, true);

    return () => {
      clearTimeout(setupTimer);
      window.removeEventListener("resize", calculatePosition);
      document.removeEventListener("scroll", calculatePosition, true);
    };
  }, [
    currentStepIndex,
    isOpen,
    calculatePosition,
    step.menuState,
    setMenuActive,
    step.selector,
  ]);

  const changeStep = (newIndex: number) => {
    setIsTransitioning(true); // Fade out
    setTimeout(() => {
      const newStep = steps[newIndex];
      const oldStep = steps[currentStepIndex];

      if (newStep.path && newStep.path !== oldStep.path) {
        onNavigate(newStep.path);
        // A longer timeout is needed to allow the new page to load
        setTimeout(() => setCurrentStepIndex(newIndex), 400);
      } else {
        setCurrentStepIndex(newIndex);
      }
    }, 300); // Match this with CSS transition duration
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      changeStep(currentStepIndex + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      changeStep(currentStepIndex - 1);
    }
  };

  const handleRestart = () => {
    changeStep(0);
  };

  const handleClose = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      onClose();
      setCurrentStepIndex(0);
    }, 300);
  };

  if (!isOpen) return null;

  const targetElement = document.querySelector(step.selector);

  const getCardPosition = () => {
    if (!targetElement) {
      // Center the card if no target
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }

    const card = tourCardRef.current;
    const cardWidth = card ? card.offsetWidth : 320;
    const cardHeight = card ? card.offsetHeight : 220;
    const margin = 15;

    // Default position below the element
    let top = position.top + position.height + margin;
    let left = position.left + position.width / 2 - cardWidth / 2;

    // Adjust if it overflows the viewport
    if (top + cardHeight > window.innerHeight) {
      top = position.top - cardHeight - margin; // Position above
    }
    if (left + cardWidth > window.innerWidth) {
      left = window.innerWidth - cardWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }
    if (top < margin) {
      top = margin;
    }

    return { top: `${top}px`, left: `${left}px` };
  };

  return (
    <div
      className="fixed inset-0 z-[10000] transition-opacity duration-300"
      style={{
        opacity: isTransitioning ? 0 : 1,
        pointerEvents: isTransitioning ? "none" : "auto",
      }}
    >
      {/* OVERLAY */}
      <div
        className="fixed inset-0 bg-black"
        style={{
          clipPath: targetElement
            ? `path(evenodd, 'M0 0 H ${window.innerWidth} V ${
                window.innerHeight
              } H 0 Z M ${position.left - 6} ${position.top - 6} H ${
                position.left + position.width + 6
              } V ${position.top + position.height + 6} H ${
                position.left - 6
              } Z')`
            : "none",
          opacity: 0.65,
        }}
      ></div>

      {/* TOUR CARD */}
      <div
        ref={tourCardRef}
        className="fixed bg-gray-800 text-white p-4 rounded-lg shadow-xl w-80"
        style={{ ...getCardPosition(), transition: "top 0.3s, left 0.3s" }}
      >
        <h3 className="text-lg font-bold mb-2">{step.title}</h3>
        <p className="text-sm mb-4">{step.content}</p>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-x-4">
            <button
              onClick={handleClose}
              className="text-sm text-gray-400 hover:text-white"
            >
              Stop
            </button>
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
      </div>
    </div>
  );
};

export default Tour;

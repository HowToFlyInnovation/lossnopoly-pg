// src/pages/privatePages/views/IdeaAssessmentViewPage.tsx
import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import type { Idea, Evaluation } from "./IdeaTile"; // Assuming types are exported from IdeaTile
import { FaInfoCircle } from "react-icons/fa"; // Import the icon

// --- TYPE DEFINITIONS ---

interface ProcessedIdea extends Idea {
  avgImpact: number;
  avgFeasibility: number;
  evaluationCount: number;
}

interface ChartDotProps {
  idea: ProcessedIdea;
  color: string;
  onClick: () => void;
  isSelected: boolean;
}

interface IdeaListCardProps {
  idea: ProcessedIdea;
  color: string;
  onClick: () => void;
  isSelected: boolean;
}

// --- CONSTANTS ---

const costImpactOptions = [
  "Negative",
  "$0-$10K",
  "$10K-$30K",
  "$30K-$100K",
  "$100K-$250K",
  "$250K-$500K",
  "$500K-$1M",
  "$1M+",
];

const feasibilityOptions = [
  "Impossible to pull off",
  "Borderline impossible",
  "Very difficult to execute",
  "Challenging to accomplish",
  "Doable, but requires significant effort",
  "Moderately easy",
  "Straightforward to implement",
  "Very easy to do",
];

// Colors from IdeaTile for the list on the left
const missionListColors: { [key: string]: string } = {
  "E2E Touchless Supply Chain": "bg-amber-300",
  "E2E Touchless Innovation": "bg-amber-600",
  "Zero Waste": "bg-blue-400",
};

// Updated mission chart colors to match the list colors
const missionChartColors: { [key: string]: string } = {
  "Sub-Challenge 1: E2E Touchless Supply Chain": "rgb(252 211 77)", // amber-600
  "Sub-Challenge 2: E2E Touchless Innovation": "rgb(217 119 6)", // green-600
  "Sub-Challenge 3: Zero Waste": "#2563eb", // blue-600
};

// --- [NEW] INFO MODAL COMPONENT ---
const InfoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
      onClick={onClose} // Close on overlay click
    >
      <div
        className="bg-gray-800 text-white p-8 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            How to Use the Idea Assessment View
          </h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold text-white hover:text-gray-400"
          >
            &times;
          </button>
        </div>

        <div className="space-y-6 text-gray-300">
          <div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              1. The Impact vs. Feasibility Chart
            </h3>
            <p>
              This chart provides a visual representation of all evaluated
              ideas. Each dot on the chart is a unique idea.
            </p>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <p className="font-bold">
                [IMAGE: Screenshot of the Impact vs. Feasibility Chart]
              </p>
            </div>
            <ul className="list-disc list-inside ml-4 my-2 space-y-1">
              <li>
                <strong>Vertical Axis (Y):</strong> Represents the 'Feasibility'
                of an idea, from 'Low' at the bottom to 'High' at the top.
              </li>
              <li>
                <strong>Horizontal Axis (X):</strong> Represents the 'Impact' of
                an idea, from 'Low' at the left to 'High' at the right.
              </li>
              <li>
                <strong>The Goal:</strong> The most promising ideas are
                typically found in the top-right quadrant (High Impact, High
                Feasibility).
              </li>
              <li>
                <strong>Colors:</strong> Each dot is colored according to its
                Sub-Challenge, as shown in the legend below the chart.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              2. Interacting with Ideas
            </h3>
            <p>
              You can explore ideas by clicking on them either in the list on
              the left or on their corresponding dot in the chart.
            </p>
            <ul className="list-disc list-inside ml-4 my-2 space-y-1">
              <li>
                <strong>Selecting an Idea:</strong> Click on any idea card in
                the list or its dot on the chart. This will highlight the idea,
                expand its details in the list, and focus on it in the chart.
              </li>
              <li>
                <strong>Deselecting an Idea:</strong> Simply click the selected
                idea again (either the card or the dot) to deselect it and
                return to the view of all ideas.
              </li>
            </ul>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <p className="font-bold">
                [IMAGE: Screenshot of a selected idea, highlighted on the chart
                and in the list]
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const ChartDot: React.FC<ChartDotProps> = ({
  idea,
  color,
  onClick,
  isSelected,
}) => {
  const bottom = `calc(${(idea.avgFeasibility / 8) * 100}% - 10px)`;
  const left = `calc(${(idea.avgImpact / 8) * 100}% - 10px)`;
  const size = isSelected ? "w-8 h-8" : "w-5 h-5";
  const zIndex = isSelected ? 10 : 1;

  return (
    <div
      className={`absolute rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg cursor-pointer transform transition-all duration-300 ${size} ${
        isSelected ? "ring-4 ring-offset-2 ring-yellow-400" : ""
      }`}
      style={{
        backgroundColor: color,
        bottom,
        left,
        transition: "all 0.3s ease-in-out",
        zIndex,
      }}
      title={`${idea.ideaTitle}\nImpact: ${idea.avgImpact.toFixed(
        1
      )}\nFeasibility: ${idea.avgFeasibility.toFixed(1)}`}
      onClick={onClick}
    >
      {idea.ideaNumber}
    </div>
  );
};

const ImpactFeasibilityChart: React.FC<{
  ideas: ProcessedIdea[];
  onSelectIdea: (idea: ProcessedIdea) => void;
  selectedIdea: ProcessedIdea | null;
}> = ({ ideas, onSelectIdea, selectedIdea }) => {
  const chartIdeas = selectedIdea ? [selectedIdea] : ideas;
  return (
    <div className="w-full bg-gray-50 p-6 rounded-lg shadow-inner relative aspect-square">
      <div className="absolute top-0 left-1/2 w-px h-full bg-gray-300"></div>
      <div className="absolute top-1/2 left-0 h-px w-full bg-gray-300"></div>
      <span className="absolute bottom-[-2rem] left-1/2 -translate-x-1/2 text-gray-600 font-semibold">
        Impact
      </span>
      <span className="absolute left-[-3rem] top-1/2 -translate-y-1/2 -rotate-90 text-gray-600 font-semibold">
        Feasibility
      </span>
      <span className="absolute top-[-1rem] left-1/2 -translate-x-1/2 text-gray-500 text-sm">
        High
      </span>
      <span className="absolute bottom-[-1rem] left-0 text-gray-500 text-sm">
        Low
      </span>
      <span className="absolute bottom-0 left-[-2rem] text-gray-500 text-sm">
        Low
      </span>
      <span className="absolute top-0 left-[-2.5rem] text-gray-500 text-sm">
        High
      </span>

      {chartIdeas.map((idea) => {
        const missionName =
          Object.keys(missionChartColors).find((m) => {
            const parts = m.split(":");
            // Safely access parts[1] and call trim() only if parts.length is greater than 1
            return (
              parts.length > 1 && idea.ideationMission.includes(parts[1].trim())
            );
          }) || "Default";
        const color = missionChartColors[missionName] || "#808080";
        return (
          <ChartDot
            key={idea.id}
            idea={idea}
            color={color}
            onClick={() => onSelectIdea(idea)}
            isSelected={selectedIdea?.id === idea.id}
          />
        );
      })}
    </div>
  );
};

const IdeaListCard: React.FC<IdeaListCardProps> = ({
  idea,
  color,
  onClick,
  isSelected,
}) => {
  if (isSelected) {
    return (
      <div
        className={`w-full p-3 rounded-lg shadow-md text-white ${color} flex flex-col cursor-pointer ring-4 ring-offset-2 ring-yellow-400`}
        onClick={onClick}
      >
        {idea.imageUrl ? (
          <img
            src={idea.imageUrl}
            alt={idea.ideaTitle}
            className="w-full h-32 object-cover rounded-md mb-3"
          />
        ) : (
          <div className="w-full h-32 bg-white/30 rounded-md mb-3 flex items-center justify-center font-bold text-3xl">
            #{idea.ideaNumber}
          </div>
        )}
        <div className="flex-grow">
          <h4 className="font-bold">
            #{idea.ideaNumber}: {idea.ideaTitle}
          </h4>
          <p className="text-sm opacity-90 mt-2">{idea.shortDescription}</p>
        </div>
        <div className="mt-4">
          <p className="text-sm opacity-90 mb-2">{idea.reasoning}</p>
          <p className="text-sm opacity-90 font-bold">
            Cost: {idea.costEstimate}
          </p>
          <p className="text-sm opacity-90 font-bold">
            Feasibility: {idea.feasibilityEstimate}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full p-3 rounded-lg shadow-md text-white ${color} flex flex-col cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-center">
        {idea.imageUrl ? (
          <img
            src={idea.imageUrl}
            alt={idea.ideaTitle}
            className="w-12 h-12 object-cover rounded-md flex-shrink-0 mr-3"
          />
        ) : (
          <div className="w-12 h-12 bg-white/30 rounded-md flex-shrink-0 mr-3 flex items-center justify-center font-bold text-lg">
            #{idea.ideaNumber}
          </div>
        )}
        <div className="flex-grow">
          <h4 className="font-bold">
            #{idea.ideaNumber}: {idea.ideaTitle}
          </h4>
          <p className="text-sm opacity-90">
            {`${idea.shortDescription.substring(0, 50)}...`}
          </p>
        </div>
      </div>
    </div>
  );
};

const IdeaAssessmentViewPage: React.FC = () => {
  const [processedIdeas, setProcessedIdeas] = useState<ProcessedIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState<ProcessedIdea | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false); // State for info modal

  useEffect(() => {
    let unsubIdeas: () => void;
    let unsubEvals: () => void;

    const fetchData = () => {
      let ideasData: Idea[] = [];
      let evaluationsData: Evaluation[] = [];

      unsubIdeas = onSnapshot(collection(db, "ideas"), (snapshot) => {
        ideasData = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as Idea[];
        processData(ideasData, evaluationsData);
      });

      unsubEvals = onSnapshot(collection(db, "evaluations"), (snapshot) => {
        evaluationsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Evaluation[];
        processData(ideasData, evaluationsData);
      });
    };

    const processData = (ideas: Idea[], evaluations: Evaluation[]) => {
      if (!ideas.length) {
        setLoading(false);
        return;
      }

      const newProcessedIdeas = ideas
        .map((idea) => {
          const relatedEvals = evaluations.filter((e) => e.ideaId === idea.id);
          if (relatedEvals.length === 0) {
            return {
              ...idea,
              avgImpact: 0,
              avgFeasibility: 0,
              evaluationCount: 0,
            };
          }
          const totalImpact = relatedEvals.reduce((sum, e) => {
            const score = costImpactOptions.indexOf(e.ImpactScore);
            return sum + (score !== -1 ? score + 1 : 0);
          }, 0);
          const totalFeasibility = relatedEvals.reduce((sum, e) => {
            const score = feasibilityOptions.indexOf(e.FeasibilityScore);
            return sum + (score !== -1 ? score + 1 : 0);
          }, 0);
          return {
            ...idea,
            avgImpact: totalImpact / relatedEvals.length,
            avgFeasibility: totalFeasibility / relatedEvals.length,
            evaluationCount: relatedEvals.length,
          };
        })
        .filter((idea) => idea.evaluationCount > 0);

      setProcessedIdeas(newProcessedIdeas);
      setLoading(false);
    };

    fetchData();

    return () => {
      if (unsubIdeas) unsubIdeas();
      if (unsubEvals) unsubEvals();
    };
  }, []);

  const handleIdeaClick = (idea: ProcessedIdea) => {
    if (selectedIdea?.id === idea.id) {
      setSelectedIdea(null);
    } else {
      setSelectedIdea(idea);
    }
  };

  // Updated legendItems for consistency with idea tile and mission options
  const legendItems = {
    "E2E Touchless Supply Chain":
      missionChartColors["Sub-Challenge 1: E2E Touchless Supply Chain"],
    "E2E Touchless Innovation":
      missionChartColors["Sub-Challenge 2: E2E Touchless Innovation"],
    "Zero Waste": missionChartColors["Sub-Challenge 3: Zero Waste"],
  };

  const listIdeas = selectedIdea ? [selectedIdea] : processedIdeas;

  return (
    <div className="w-full py-[11vh] px-12 md:px-16 bg-gray-100 min-h-screen">
      <button
        onClick={() => setIsInfoModalOpen(true)}
        className="p-3 bg-gray-800 text-white rounded-lg shadow-md hover:bg-black focus:outline-none absolute top-5 right-5 cursor-pointer z-20"
        aria-label="Show info"
      >
        <FaInfoCircle size={20} />
      </button>
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 uppercase mb-8">
        Idea Assessments
      </h1>
      {loading ? (
        <p>Loading assessment data...</p>
      ) : (
        <div className="flex flex-col md:flex-row-reverse gap-8">
          {/* Right Panel (now first on mobile): Chart and Legend */}
          <div className="w-[80%] mx-auto md:w-[35%] lg:w-[40%]">
            <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">
              Impact VS Feasibility
            </h2>
            <ImpactFeasibilityChart
              ideas={processedIdeas}
              onSelectIdea={handleIdeaClick}
              selectedIdea={selectedIdea}
            />
            <div className="flex justify-center items-center gap-6 mt-12">
              {Object.entries(legendItems).map(([name, color]) => (
                <div key={name} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: color }}
                  ></div>
                  <span className="text-xs font-medium text-gray-600">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Left Panel (now second on mobile): Idea List */}
          <div className="w-full md:w-[40%] lg:w-[35%]">
            <h2 className="text-xl font-bold text-gray-700 mb-4">
              {selectedIdea ? "Selected Idea" : "All Ideas"}
            </h2>
            <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-2">
              {listIdeas.map((idea) => {
                const missionName =
                  Object.keys(missionListColors).find((m) =>
                    idea.ideationMission.includes(m.split(":")[0])
                  ) || "Default";
                const color = missionListColors[missionName] || "bg-gray-500";
                return (
                  <IdeaListCard
                    key={idea.id}
                    idea={idea}
                    color={color}
                    onClick={() => handleIdeaClick(idea)}
                    isSelected={selectedIdea?.id === idea.id}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
      {isInfoModalOpen && (
        <InfoModal onClose={() => setIsInfoModalOpen(false)} />
      )}
    </div>
  );
};

export default IdeaAssessmentViewPage;

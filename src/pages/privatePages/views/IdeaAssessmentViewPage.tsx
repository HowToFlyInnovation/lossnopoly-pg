// src/pages/privatePages/views/IdeaAssessmentViewPage.tsx
import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import type { Idea, Evaluation } from "./IdeaTile"; // Assuming types are exported from IdeaTile

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
  "Very easy to do",
  "Straightforward to implement",
  "Moderately easy",
  "Doable, but requires significant effort",
  "Challenging to accomplish",
  "Very difficult to execute",
  "Borderline impossible",
  "Impossible to pull off",
];

// Colors from IdeaTile for the list on the left
const missionListColors: { [key: string]: string } = {
  "Touchless Processes": "bg-amber-600",
  "Touchless Innovation": "bg-green-600",
  "Waste Reduction": "bg-blue-600",
};

// Updated mission chart colors to match the list colors
const missionChartColors: { [key: string]: string } = {
  "Mission 1: Touchless Process": "#D97706", // amber-600
  "Mission 2: Touchless Innovation": "#16A34A", // green-600
  "Mission 3: Waste Reduction": "#2563EB", // blue-600
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
          Object.keys(missionChartColors).find((m) =>
            idea.ideationMission.includes(m.split(":")[1].trim())
          ) || "Default";
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
            return sum + (score !== -1 ? 8 - score : 0);
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

  const legendItems = {
    "Mission 1: Touchless Process":
      missionChartColors["Mission 1: Touchless Process"],
    "Mission 2: Touchless Innovation":
      missionChartColors["Mission 2: Touchless Innovation"],
    "Mission 3: Waste Reduction":
      missionChartColors["Mission 3: Waste Reduction"],
  };

  const listIdeas = selectedIdea ? [selectedIdea] : processedIdeas;

  return (
    <div className="w-full py-[11vh] px-8 md:px-10 bg-gray-100 min-h-screen">
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 uppercase mb-8">
        Idea Assessments
      </h1>
      {loading ? (
        <p>Loading assessment data...</p>
      ) : (
        <div className="flex flex-col md:flex-row-reverse gap-8">
          {/* Right Panel (now first on mobile): Chart and Legend */}
          <div className="w-[80%] mx-auto md:w-[55%] lg:w-[60%]">
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
                  <span className="text-sm font-medium text-gray-600">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Left Panel (now second on mobile): Idea List */}
          <div className="w-full md:w-[35%] lg:w-[30%]">
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
    </div>
  );
};

export default IdeaAssessmentViewPage;

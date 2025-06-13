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
}

interface IdeaListCardProps {
  idea: Idea;
  color: string;
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

// Colors based on the provided image legend
const missionChartColors: { [key: string]: string } = {
  "Mission 1: Touchless Process": "#4682B4", // Steel Blue (like Mission 1)
  "Mission 2: Touchless Innovation": "#8A2BE2", // Blue Violet (like Mission 2)
  "Mission 3: Waste Reduction": "#DC143C", // Crimson (like Mission 3)
};

// Colors from IdeaTile for the list on the left
const missionListColors: { [key: string]: string } = {
  "Touchless Processes": "bg-amber-600",
  "Touchless Innovation": "bg-green-600",
  "Waste Reduction": "bg-blue-600",
};

// --- SUB-COMPONENTS ---

/**
 * A single dot representing an idea on the Impact vs. Feasibility chart.
 */
const ChartDot: React.FC<ChartDotProps> = ({ idea, color }) => {
  // Positioning: 0% is bottom/left, 100% is top/right.
  // We subtract a small amount to keep the dot's center from being on the edge.
  const bottom = `calc(${(idea.avgFeasibility / 8) * 100}% - 10px)`;
  const left = `calc(${(idea.avgImpact / 8) * 100}% - 10px)`;

  return (
    <div
      className="absolute w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
      style={{
        backgroundColor: color,
        bottom,
        left,
        transition: "all 0.3s ease-in-out",
      }}
      title={`${idea.ideaTitle}\nImpact: ${idea.avgImpact.toFixed(
        1
      )}\nFeasibility: ${idea.avgFeasibility.toFixed(1)}`}
    >
      {idea.id.substring(0, 2)}
    </div>
  );
};

/**
 * The main Impact vs. Feasibility chart component.
 */
const ImpactFeasibilityChart: React.FC<{ ideas: ProcessedIdea[] }> = ({
  ideas,
}) => {
  return (
    <div className="w-full bg-gray-50 p-6 rounded-lg shadow-inner relative aspect-square">
      {/* Grid Lines */}
      <div className="absolute top-0 left-1/2 w-px h-full bg-gray-300"></div>
      <div className="absolute top-1/2 left-0 h-px w-full bg-gray-300"></div>

      {/* Axis Labels */}
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

      {/* Chart Dots */}
      {ideas.map((idea) => {
        // Find matching mission name from chart colors
        const missionName =
          Object.keys(missionChartColors).find((m) =>
            idea.ideationMission.includes(m.split(":")[1].trim())
          ) || "Default";
        const color = missionChartColors[missionName] || "#808080"; // Default gray

        return <ChartDot key={idea.id} idea={idea} color={color} />;
      })}
    </div>
  );
};

/**
 * A card for the list of ideas on the left panel.
 */
const IdeaListCard: React.FC<IdeaListCardProps> = ({ idea, color }) => (
  <div
    className={`w-full p-3 rounded-lg shadow-md text-white ${color} flex items-center`}
  >
    <div className="w-12 h-12 bg-white/30 rounded-md flex-shrink-0 mr-3"></div>
    <div className="flex-grow">
      <h4 className="font-bold">{idea.ideaTitle}</h4>
      <p className="text-sm opacity-90">
        {idea.shortDescription.substring(0, 50)}...
      </p>
    </div>
  </div>
);

// --- MAIN VIEW COMPONENT ---

const IdeaAssessmentViewPage: React.FC = () => {
  const [processedIdeas, setProcessedIdeas] = useState<ProcessedIdea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Unsubscribe functions
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
      if (!ideas.length) return;

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
            // Invert feasibility: "Very easy" (index 0) is high (score 8)
            return sum + (score !== -1 ? 8 - score : 0);
          }, 0);

          return {
            ...idea,
            avgImpact: totalImpact / relatedEvals.length,
            avgFeasibility: totalFeasibility / relatedEvals.length,
            evaluationCount: relatedEvals.length,
          };
        })
        .filter((idea) => idea.evaluationCount > 0); // Only show ideas with evaluations

      setProcessedIdeas(newProcessedIdeas);
      setLoading(false);
    };

    fetchData();

    // Cleanup subscription on unmount
    return () => {
      if (unsubIdeas) unsubIdeas();
      if (unsubEvals) unsubEvals();
    };
  }, []);

  // Use the new mission names from the image for the legend
  const legendItems = {
    "Mission 1: Touchless Process":
      missionChartColors["Mission 1: Touchless Process"],
    "Mission 2: Touchless Innovation":
      missionChartColors["Mission 2: Touchless Innovation"],
    "Mission 3: Waste Reduction":
      missionChartColors["Mission 3: Waste Reduction"],
  };

  return (
    <div className="w-full pt-[11vh] px-4 md:px-10 bg-gray-100 min-h-screen">
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 uppercase mb-8">
        Idea Assessments
      </h1>
      {loading ? (
        <p>Loading assessment data...</p>
      ) : (
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Panel: Idea List */}
          <div className="w-full md:w-1/4 lg:w-1/5">
            <h2 className="text-xl font-bold text-gray-700 mb-4">All Ideas</h2>
            <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-2">
              {processedIdeas.map((idea) => {
                const missionName =
                  Object.keys(missionListColors).find((m) =>
                    idea.ideationMission.includes(m)
                  ) || "Default";
                const color = missionListColors[missionName] || "bg-gray-500";
                return <IdeaListCard key={idea.id} idea={idea} color={color} />;
              })}
            </div>
          </div>

          {/* Right Panel: Chart and Legend */}
          <div className="w-full md:w-3/4 lg:w-4/5">
            <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">
              Impact VS Feasibility
            </h2>
            <ImpactFeasibilityChart ideas={processedIdeas} />
            {/* Legend */}
            <div className="flex justify-center items-center gap-6 mt-6">
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
        </div>
      )}
    </div>
  );
};

export default IdeaAssessmentViewPage;

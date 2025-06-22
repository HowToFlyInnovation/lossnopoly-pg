// src/pages/privatePages/views/IdeaAssessmentViewPage.tsx
import React, { useState, useEffect, useContext } from "react";
import {
  collection,
  onSnapshot,
  query,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { AuthContext } from "../../context/AuthContext";
import IdeaTile, { type Idea, type Evaluation, type Vote } from "./IdeaTile";
import { FaInfoCircle } from "react-icons/fa";

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

const missionListColors: { [key: string]: string } = {
  "E2E Touchless Supply Chain": "bg-amber-300",
  "E2E Touchless Innovation": "bg-amber-600",
  "Zero Waste": "bg-blue-400",
};

const missionChartColors: { [key: string]: string } = {
  "Sub-Challenge 1: E2E Touchless Supply Chain": "rgb(252 211 77)",
  "Sub-Challenge 2: E2E Touchless Innovation": "rgb(217 119 6)",
  "Sub-Challenge 3: Zero Waste": "#63b3ed",
};

// --- INFO MODAL COMPONENT ---
const InfoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 text-white p-8 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
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
                the list or its dot on the chart. This will highlight the idea
                and show a detailed view. The chart will focus only on the
                selected idea.
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
                and shown in detail]
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
      className={`absolute rounded-full flex items-center justify-center text-black text-xs font-bold shadow-lg cursor-pointer transform transition-all duration-300 ${size} ${
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
      {/* Grid lines and labels */}
      <div className="absolute top-0 left-1/2 w-px h-full bg-gray-300"></div>
      <div className="absolute top-1/2 left-0 h-px w-full bg-gray-300"></div>
      <span className="absolute bottom-[-3.5rem] left-1/2 -translate-x-1/2 text-gray-600 font-semibold">
        Impact
      </span>
      <span className="absolute left-[-3.5rem] top-1/2 -translate-y-1/2 -rotate-90 text-gray-600 font-semibold">
        Feasibility
      </span>
      <span className="absolute bottom-0 left-[-2.5rem] text-gray-500 text-sm">
        Low
      </span>
      <span className="absolute top-0 left-[-2.5rem] text-gray-500 text-sm">
        High
      </span>

      {/* X-axis labels */}
      <span className="absolute bottom-[-1.5rem] left-0 -translate-x-1/2 text-gray-500 text-xs">
        $0
      </span>
      <span className="absolute bottom-[-1.5rem] left-1/4 -translate-x-1/2 text-gray-500 text-xs">
        $10K
      </span>
      <span className="absolute bottom-[-1.5rem] left-1/2 -translate-x-1/2 text-gray-500 text-xs">
        $100K
      </span>
      <span className="absolute bottom-[-1.5rem] left-3/4 -translate-x-1/2 text-gray-500 text-xs">
        $500K
      </span>
      <span className="absolute bottom-[-1.5rem] left-full -translate-x-1/2 text-gray-500 text-xs">
        $1M+
      </span>

      {/* Dots representing ideas */}
      {chartIdeas.map((idea) => {
        const missionName =
          Object.keys(missionChartColors).find((m) => {
            const parts = m.split(":");
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
  return (
    <div
      className={`w-full p-3 rounded-lg shadow-md text-black ${color} flex flex-col cursor-pointer transition-all duration-200 ${
        isSelected ? "ring-4 ring-offset-2 ring-yellow-400" : ""
      }`}
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
  const authContext = useContext(AuthContext);
  const [processedIdeas, setProcessedIdeas] = useState<ProcessedIdea[]>([]);
  const [votesData, setVotesData] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState<ProcessedIdea | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  useEffect(() => {
    if (!authContext?.user) {
      setLoading(false);
      return;
    }
    const user = authContext.user;

    const ideasQuery = query(collection(db, "ideas"));
    const evaluationsQuery = query(collection(db, "evaluations"));
    const votesQuery = query(collection(db, "ideasVotes"));

    const unsubIdeas = onSnapshot(ideasQuery, (ideasSnapshot) => {
      const ideasData = ideasSnapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as Idea)
      );

      const unsubEvals = onSnapshot(evaluationsQuery, (evalsSnapshot) => {
        const evaluationsData = evalsSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Evaluation)
        );

        const userEvaluatedIdeaIds = new Set(
          evaluationsData
            .filter((e) => e.EvaluatorUserId === user.uid)
            .map((e) => e.ideaId)
        );

        const newProcessedIdeas = ideasData
          .filter((idea) => userEvaluatedIdeaIds.has(idea.id))
          .map((idea) => {
            const relatedEvals = evaluationsData.filter(
              (e) => e.ideaId === idea.id
            );
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
              avgImpact:
                relatedEvals.length > 0 ? totalImpact / relatedEvals.length : 0,
              avgFeasibility:
                relatedEvals.length > 0
                  ? totalFeasibility / relatedEvals.length
                  : 0,
              evaluationCount: relatedEvals.length,
            };
          });

        newProcessedIdeas.sort((a, b) => {
          const aIsHighImpact = a.avgImpact > 4;
          const aIsHighFeasibility = a.avgFeasibility > 4;
          const bIsHighImpact = b.avgImpact > 4;
          const bIsHighFeasibility = b.avgFeasibility > 4;
          const aIsGreen = aIsHighImpact && aIsHighFeasibility;
          const bIsGreen = bIsHighImpact && bIsHighFeasibility;
          if (aIsGreen && !bIsGreen) return -1;
          if (!aIsGreen && bIsGreen) return 1;
          const aIsYellow = (aIsHighImpact || aIsHighFeasibility) && !aIsGreen;
          const bIsYellow = (bIsHighImpact || bIsHighFeasibility) && !bIsGreen;
          if (aIsYellow && !bIsYellow) return -1;
          if (!aIsYellow && bIsYellow) return 1;
          if (b.avgImpact !== a.avgImpact) return b.avgImpact - a.avgImpact;
          if (b.avgFeasibility !== a.avgFeasibility)
            return b.avgFeasibility - a.avgFeasibility;
          return (a.ideaNumber ?? 0) - (b.ideaNumber ?? 0);
        });

        setProcessedIdeas(newProcessedIdeas);
        setLoading(false);
      });
      return () => unsubEvals();
    });

    const unsubVotes = onSnapshot(votesQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data() as Vote);
      setVotesData(data);
    });

    return () => {
      unsubIdeas();
      unsubVotes();
    };
  }, [authContext]);

  const handleIdeaClick = (idea: ProcessedIdea) => {
    setSelectedIdea((prev) => (prev?.id === idea.id ? null : idea));
  };

  const handleVote = async (voteType: "agree" | "disagree", item: Idea) => {
    if (!authContext?.user || !item.id) return;
    const user = authContext.user;
    const voteDocRef = doc(db, "ideasVotes", `${user.uid}_${item.id}`);
    const currentVote = votesData.find(
      (v) => v.ideaId === item.id && v.userId === user.uid
    );

    if (currentVote && currentVote.vote === voteType) {
      await deleteDoc(voteDocRef);
    } else {
      await setDoc(voteDocRef, {
        ideaId: item.id,
        userId: user.uid,
        vote: voteType,
        timestamp: Timestamp.now(),
      });
    }
  };

  const legendItems = {
    "E2E Touchless Supply Chain":
      missionChartColors["Sub-Challenge 1: E2E Touchless Supply Chain"],
    "E2E Touchless Innovation":
      missionChartColors["Sub-Challenge 2: E2E Touchless Innovation"],
    "Zero Waste": missionChartColors["Sub-Challenge 3: Zero Waste"],
  };

  if (!authContext?.authIsReady) {
    return <p>Loading authentication...</p>;
  }

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
          <div className="w-full md:w-2/3 lg:w-3/5">
            <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">
              Impact VS Feasibility
            </h2>
            <ImpactFeasibilityChart
              ideas={processedIdeas}
              onSelectIdea={handleIdeaClick}
              selectedIdea={selectedIdea}
            />
            <div className="flex justify-center items-center gap-6 mt-20">
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

          <div className="w-full md:w-1/3 lg:w-2/5">
            <h2 className="text-xl font-bold text-gray-700 mb-2">
              {selectedIdea ? "Selected Idea" : "Your Evaluated Ideas"}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              This list shows only the ideas that you have personally evaluated.
              To see all ideas, please visit the Ideation Space.
            </p>
            {selectedIdea ? (
              <IdeaTile
                key={selectedIdea.id}
                item={selectedIdea}
                handleVote={handleVote}
                votesData={votesData}
                handleAddToBuildDeck={() => {}}
                onSelect={() => handleIdeaClick(selectedIdea)}
                isSelected={true}
                isSelectionLocked={true}
                isDarkMode={false}
              />
            ) : processedIdeas.length > 0 ? (
              <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-2">
                {processedIdeas.map((idea) => {
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
                      isSelected={false}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-8 bg-white rounded-lg shadow">
                <p className="font-semibold text-gray-700">
                  No evaluations yet!
                </p>
                <p className="text-gray-500 mt-2">
                  Go to the Ideation Space, find an idea, and submit your
                  evaluation to see it appear here.
                </p>
              </div>
            )}
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

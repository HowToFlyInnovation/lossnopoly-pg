// src/pages/privatePages/views/IdeationSpaceView.tsx
import React, { useState, useEffect, useContext } from "react";
import {
  collection,
  doc,
  setDoc,
  Timestamp,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { AuthContext } from "../../context/AuthContext";
import type { AuthContextType } from "../../context/AuthContext";
import IdeaModal from "./IdeaModal"; // Import the IdeaModal component
import IdeaTile, {
  type Idea,
  type Vote,
  type Comment,
  type Evaluation,
} from "./IdeaTile"; // Import the new IdeaTile component and its types
import { FaInfoCircle, FaComment, FaLightbulb } from "react-icons/fa"; // Added FaInfoCircle
import { PiLegoBold } from "react-icons/pi";

// --- CONSTANTS FOR EVALUATION ---
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
  "Impossible to pull off", // Standardized order: lowest to highest feasibility
  "Borderline impossible",
  "Very difficult to execute",
  "Challenging to accomplish",
  "Doable, but requires significant effort",
  "Moderately easy",
  "Straightforward to implement",
  "Very easy to do",
];

// --- HELPER FUNCTION FOR EVALUATION CATEGORY ---
const getEvaluationCategory = (
  evaluation: Evaluation
): "green" | "yellow" | "red" | "none" => {
  const impactIndex = costImpactOptions.indexOf(evaluation.ImpactScore);
  const feasibilityIndex = feasibilityOptions.indexOf(
    evaluation.FeasibilityScore
  );

  if (impactIndex === -1 || feasibilityIndex === -1) {
    return "none";
  }

  // Assuming indexes go from lowest (0) to highest (7) for both
  const impactScore = impactIndex + 1; // 1 to 8
  const feasibilityScore = feasibilityIndex + 1; // 1 to 8

  const isHighImpact = impactScore > 4;
  const isHighFeasibility = feasibilityScore > 4;

  if (isHighImpact && isHighFeasibility) return "green";
  if (isHighImpact || isHighFeasibility) return "yellow";
  return "red";
};

// --- [NEW] INFO MODAL COMPONENT ---
const InfoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
      onClick={onClose} // Close on overlay click
    >
      <div
        className="bg-gray-800 text-white p-8 rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">How to Use the Ideation Space</h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold text-white hover:text-gray-400"
          >
            &times;
          </button>
        </div>

        <div className="space-y-6 text-gray-300">
          {/* Video Placeholder */}
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <p className="font-bold">
              [VIDEO: A quick walkthrough of the Ideation Space]
            </p>
            <p className="text-sm mt-1">
              Watch this short video to get a complete overview of all the
              features on this page.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              1. Sharing a New Idea
            </h3>
            <p>
              To submit a completely new idea, simply click the{" "}
              <strong>+ Share Idea</strong> button at the top right of the page.
              A form will appear where you can detail your concept.
            </p>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <p className="font-bold">
                [IMAGE: Screenshot of the 'Share Idea' modal]
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              2. Building Upon Existing Ideas
            </h3>
            <p>
              If an existing idea inspires you, you can build upon it. Click the
              Lego brick icon (
              <span className="inline-block align-middle">
                <PiLegoBold />
              </span>
              ) on up to three idea cards to select them. The button at the top
              will change to <strong>Build upon ideas</strong>. Clicking this
              will open the idea submission form, pre-linking your new idea to
              the ones that inspired you.
            </p>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <p className="font-bold">
                [IMAGE: Screenshot of selected ideas and the 'Build upon ideas'
                button]
              </p>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <p className="font-bold">
                [IMAGE: Screenshot of the 'Build upon Idea' modal showing the
                'Inspired By' section]
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              3. Filtering and Sorting Ideas
            </h3>
            <p>
              Use the dropdown menus at the top to filter the ideas shown. You
              can filter by:
            </p>
            <ul className="list-disc list-inside ml-4 my-2">
              <li>
                <strong>Your activity:</strong> Show all ideas, only your ideas,
                ideas you've voted on, etc.
              </li>
              <li>
                <strong>Sub-Challenge:</strong> Focus on ideas related to a
                specific sub-challenge.
              </li>
            </ul>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <p className="font-bold">
                [IMAGE: Screenshot of the filter dropdowns]
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              4. Interacting with Idea Cards
            </h3>
            <p>Each idea card has several interactive elements:</p>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <p className="font-bold">
                [IMAGE: Screenshot of an Idea Tile with callouts for different
                interaction buttons]
              </p>
            </div>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
              <li>
                <strong>Read More:</strong> Click to expand the card and see the
                full description and reasoning.
              </li>
              <li>
                <strong>Evaluate Card:</strong> Once expanded, you can provide
                your own assessment of the idea's cost impact and feasibility.
                You can also toggle between your evaluation and the average
                score from all users.
              </li>
              <li>
                <strong>
                  Comments (<FaComment className="inline-block" />
                  ):
                </strong>{" "}
                Open the comment section to discuss the idea with others. You
                can reply to existing comments to create threads.
              </li>
              <li>
                <strong>
                  Inspired By (<FaLightbulb className="inline-block" />
                  ):
                </strong>{" "}
                This icon appears if an idea was built upon others. Click it to
                see the source ideas.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MASONRY LAYOUT COMPONENT ---
const MasonryLayout: React.FC<{
  children: React.ReactNode[];
  gap?: number;
}> = ({ children, gap = 20 }) => {
  const [columnCount, setColumnCount] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 900) {
        setColumnCount(1);
      } else {
        setColumnCount(3);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const columns: React.ReactNode[][] = Array.from(
    { length: columnCount },
    () => []
  );
  children.forEach((child, i) => {
    columns[i % columnCount].push(child);
  });

  return (
    <div className="flex" style={{ gap: `${gap}px` }}>
      {columns.map((col, i) => (
        <div
          key={i}
          className="flex flex-col flex-1"
          style={{ gap: `${gap}px` }}
        >
          {col}
        </div>
      ))}
    </div>
  );
};

// --- MAIN IDEATION SPACE VIEW ---
const IdeationSpaceView: React.FC = () => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [ideasData, setIdeasData] = useState<Idea[]>([]);
  const [votesData, setVotesData] = useState<Vote[]>([]);
  const [commentsData, setCommentsData] = useState<Comment[]>([]);
  const [evaluationsData, setEvaluationsData] = useState<Evaluation[]>([]);
  const [filteredIdeas, setFilteredIdeas] = useState<Idea[]>([]);
  const [filter, setFilter] = useState("all");
  const [missionFilter, setMissionFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedIdeas, setSelectedIdeas] = useState<Idea[]>([]);

  useEffect(() => {
    const fetchIdeas = onSnapshot(collection(db, "ideas"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Idea[];
      const sortedData = data.sort(
        (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
      );
      setIdeasData(sortedData);
    });

    const fetchVotes = onSnapshot(collection(db, "ideasVotes"), (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data()) as Vote[];
      setVotesData(data);
    });

    const fetchComments = onSnapshot(collection(db, "comments"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];
      setCommentsData(data);
    });

    const fetchEvaluations = onSnapshot(
      collection(db, "evaluations"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Evaluation[];
        setEvaluationsData(data);
      }
    );

    return () => {
      fetchIdeas();
      fetchVotes();
      fetchComments();
      fetchEvaluations();
    };
  }, []);

  useEffect(() => {
    let newFilteredData = [...ideasData];

    if (filter === "all") {
      newFilteredData = [...ideasData];
    } else if (user) {
      switch (filter) {
        case "userCreated":
          newFilteredData = ideasData.filter((s) => s.userId === user.uid);
          break;
        case "userVoted":
          {
            const votedIdeaIds = new Set(
              votesData
                .filter((v) => v.userId === user.uid)
                .map((v) => v.ideaId)
            );
            newFilteredData = ideasData.filter((s) => votedIdeaIds.has(s.id));
          }
          break;
        case "unvoted":
          {
            const votedIdeaIds = new Set(
              votesData
                .filter((v) => v.userId === user.uid)
                .map((v) => v.ideaId)
            );
            newFilteredData = ideasData.filter((s) => !votedIdeaIds.has(s.id));
          }
          break;
        case "commented":
          {
            const commentedIdeaIds = new Set(
              commentsData
                .filter((c) => c.userId === user.uid)
                .map((c) => c.ideaId)
            );
            newFilteredData = ideasData.filter((idea) =>
              commentedIdeaIds.has(idea.id)
            );
          }
          break;
        case "topVoted":
        case "mediumVoted":
        case "lowVoted":
          {
            const userEvaluations = evaluationsData.filter(
              (e) => e.EvaluatorUserId === user.uid
            );
            const categorizedIdeaIds = new Set(
              userEvaluations
                .filter((e) => {
                  const category = getEvaluationCategory(e);
                  if (filter === "topVoted") return category === "green";
                  if (filter === "mediumVoted") return category === "yellow";
                  if (filter === "lowVoted") return category === "red";
                  return false;
                })
                .map((e) => e.ideaId)
            );
            newFilteredData = ideasData.filter((idea) =>
              categorizedIdeaIds.has(idea.id)
            );
          }
          break;
        default:
          newFilteredData = [...ideasData];
      }
    } else {
      newFilteredData = [];
    }
    if (missionFilter !== "all") {
      newFilteredData = newFilteredData.filter(
        (idea) => idea.ideationMission === missionFilter
      );
    }

    setFilteredIdeas(newFilteredData);
  }, [
    filter,
    missionFilter,
    ideasData,
    votesData,
    commentsData,
    evaluationsData,
    user,
  ]);

  const handleSelectIdea = (idea: Idea) => {
    setSelectedIdeas((prevSelected) => {
      const isSelected = prevSelected.some((i) => i.id === idea.id);
      if (isSelected) {
        return prevSelected.filter((i) => i.id !== idea.id);
      } else {
        if (prevSelected.length < 3) {
          return [...prevSelected, idea];
        }
        return prevSelected; // Max selection reached
      }
    });
  };

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedIdeas([]); // Clear selection after modal closes
  };

  const handleVote = async (voteType: "agree" | "disagree", item: Idea) => {
    if (!user) return;
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

  const handleAddToBuildDeck = (card: any) => {
    console.log("Added to build deck:", card);
  };

  const isSelectionLocked = selectedIdeas.length >= 3;
  const hasSelection = selectedIdeas.length > 0;

  const buildButtonText =
    selectedIdeas.length > 1
      ? `Build upon ideas (${selectedIdeas.length})`
      : "Build upon Idea";

  return (
    <div className="w-full py-[11vh] px-8 md:px-20 text-black bg-gray-100 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 uppercase">
          Ideation Space
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <button
            onClick={() => setIsInfoModalOpen(true)}
            className="p-3 bg-gray-800 text-white rounded-lg shadow-md hover:bg-black focus:outline-none absolute top-5 right-5 cursor-pointer"
            aria-label="Show info"
          >
            <FaInfoCircle size={20} />
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg focus:outline-none w-full md:w-auto"
          >
            <option value="all">All Ideas</option>
            <option value="userCreated">My Ideas</option>
            <option value="commented">Commented By Me</option>
            <option value="userVoted">Voted By Me</option>
            <option value="unvoted">Not Voted By Me</option>
            <option value="topVoted">My Top Ideas</option>
            <option value="mediumVoted">My Medium Ideas</option>
            <option value="lowVoted">My Low Ideas</option>
          </select>
          <select
            value={missionFilter}
            onChange={(e) => setMissionFilter(e.target.value)}
            className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none w-full md:w-auto"
          >
            <option value="all">All Missions</option>
            <option value="E2E Touchless Supply Chain">
              E2E Touchless Supply Chain
            </option>
            <option value="E2E Touchless Innovation">
              E2E Touchless Innovation
            </option>
            <option value="Zero Waste">Zero Waste</option>
          </select>
          <button
            onClick={handleOpenModal}
            className={`font-semibold py-2 px-4 rounded-lg shadow-md w-full md:w-auto transition-colors duration-300 ${
              hasSelection
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-red-500 hover:bg-red-700 text-white"
            }`}
          >
            {hasSelection ? buildButtonText : "+ Share Idea"}
          </button>
        </div>
      </div>

      <MasonryLayout gap={20}>
        {filteredIdeas.map((item) => (
          <IdeaTile
            key={item.id}
            item={item}
            handleVote={handleVote}
            votesData={votesData}
            handleAddToBuildDeck={handleAddToBuildDeck}
            onSelect={handleSelectIdea}
            isSelected={selectedIdeas.some((i) => i.id === item.id)}
            isSelectionLocked={isSelectionLocked}
          />
        ))}
      </MasonryLayout>

      {isModalOpen && (
        <IdeaModal onClose={handleCloseModal} inspiredBy={selectedIdeas} />
      )}

      {isInfoModalOpen && (
        <InfoModal onClose={() => setIsInfoModalOpen(false)} />
      )}
    </div>
  );
};

export default IdeationSpaceView;

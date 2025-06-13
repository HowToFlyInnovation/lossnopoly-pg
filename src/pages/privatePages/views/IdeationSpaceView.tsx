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
  "Very easy to do",
  "Straightforward to implement",
  "Moderately easy",
  "Doable, but requires significant effort",
  "Challenging to accomplish",
  "Very difficult to execute",
  "Borderline impossible",
  "Impossible to pull off",
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

  const impactScore = impactIndex + 1;
  const feasibilityScore = 8 - feasibilityIndex;

  const isHighImpact = impactScore > 4;
  const isHighFeasibility = feasibilityScore > 4;

  if (isHighImpact && isHighFeasibility) return "green";
  if (isHighImpact || isHighFeasibility) return "yellow";
  return "red";
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
    <div className="w-full pt-[11vh] px-4 md:px-20 text-black bg-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 uppercase">
          Ideation Space
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
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
            <option value="Touchless Processes">Touchless Processes</option>
            <option value="Touchless Innovation">Touchless Innovation</option>
            <option value="Waste Reduction">Waste Reduction</option>
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
    </div>
  );
};

export default IdeationSpaceView;

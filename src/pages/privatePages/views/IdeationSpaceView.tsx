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
  const [isModalOpen, setIsModalOpen] = useState(false);

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

    if (!user) {
      const publicFilters = [
        "Touchless Processes",
        "Touchless Innovation",
        "Waste Reduction",
        "all",
      ];
      if (!publicFilters.includes(filter)) {
        setFilteredIdeas([]);
        return;
      }
    }

    if (filter === "userCreated") {
      newFilteredData = ideasData.filter((s) => s.userId === user?.uid);
    } else if (filter === "userVoted") {
      const votedIdeaIds = new Set(
        votesData.filter((v) => v.userId === user?.uid).map((v) => v.ideaId)
      );
      newFilteredData = ideasData.filter((s) => votedIdeaIds.has(s.id));
    } else if (filter === "unvoted") {
      const votedIdeaIds = new Set(
        votesData.filter((v) => v.userId === user?.uid).map((v) => v.ideaId)
      );
      newFilteredData = ideasData.filter((s) => !votedIdeaIds.has(s.id));
    } else if (
      filter === "Touchless Processes" ||
      filter === "Touchless Innovation" ||
      filter === "Waste Reduction"
    ) {
      newFilteredData = ideasData.filter(
        (idea) => idea.ideationMission === filter
      );
    } else if (filter === "commented") {
      if (user) {
        const commentedIdeaIds = new Set(
          commentsData.filter((c) => c.userId === user.uid).map((c) => c.ideaId)
        );
        newFilteredData = ideasData.filter((idea) =>
          commentedIdeaIds.has(idea.id)
        );
      } else {
        newFilteredData = [];
      }
    } else if (
      filter === "topVoted" ||
      filter === "mediumVoted" ||
      filter === "lowVoted"
    ) {
      const userEvaluations = evaluationsData.filter(
        (e) => e.EvaluatorUserId === user?.uid
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

    setFilteredIdeas(newFilteredData);
  }, [filter, ideasData, votesData, commentsData, evaluationsData, user]);

  const handleVote = async (voteType: "agree" | "disagree", item: Idea) => {
    if (!user) return;

    const voteDocRef = doc(db, "ideasVotes", `${user.uid}_${item.id}`);
    const currentVote = votesData.find(
      (v) => v.ideaId === item.id && v.userId === user.uid
    );

    if (currentVote && currentVote.vote === voteType) {
      // User is clicking the same button again, so remove the vote
      await deleteDoc(voteDocRef);
    } else {
      // Add or update the vote
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

  return (
    <div className="w-full pt-[11vh] px-4 md:px-20 text-black bg-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-4 md:mb-0 uppercase">
          Ideation Space
        </h1>
        <div className="flex items-center gap-4">
          <select
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg focus:outline-none"
          >
            <option value="all">All Ideas</option>
            <option value="userCreated">My Ideas</option>
            <option value="commented">Ideas Commented on by Me</option>
            <option value="userVoted">Ideas Voted by Me</option>
            <option value="topVoted">Top Voted by Me</option>
            <option value="mediumVoted">Medium Voted by Me</option>
            <option value="lowVoted">Low Voted by Me</option>
            <option value="unvoted">Unvoted Ideas</option>
            <option value="Touchless Processes">Touchless Process Ideas</option>
            <option value="Touchless Innovation">
              Touchless Innovation Ideas
            </option>
            <option value="Waste Reduction">Waste Reduction Ideas</option>
          </select>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-red-700"
          >
            + Share Idea
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
          />
        ))}
      </MasonryLayout>

      {isModalOpen && <IdeaModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default IdeationSpaceView;

// src/pages/privatePages/views/IdeationSpaceView.tsx
import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  collection,
  doc,
  setDoc,
  Timestamp,
  onSnapshot,
  deleteDoc,
  query,
  where,
  getDocs,
  getDoc,
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
import { getEvaluationCategory } from "../../../lib/constants.ts";

// --- TYPE DEFINITIONS ---

interface PlayerTagging {
  id: string;
  ideaId: string;
  taggedPlayerEmail: string;
  timestamp: Timestamp;
}

// --- [NEW] INFO MODAL COMPONENT ---
const InfoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50000"
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
          <div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              1. Sharing a New Idea
            </h3>
            <p>
              To submit a completely new idea, simply click the{" "}
              <strong>+ Share Idea</strong> button at the top right of the page.
              A modal will appear where you can detail your idea.
            </p>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <p className="font-bold">
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/IdeationSpace_Visual1.png?alt=media&token=28ef3c26-1eed-4de7-ab37-dd81cc23958c"
                  className="w-full"
                />
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
              will open the idea submission modal, pre-linking your new idea to
              the ones that inspired you.
            </p>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <p className="font-bold">
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/IdeationSpace_Visual2.png?alt=media&token=5b59aeca-c55b-435f-9ecd-c19c8dba8e65"
                  className="w-full"
                />
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
              <li>
                <strong>Area:</strong> Filter by a specific area of interest.
              </li>
            </ul>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/IdeationSpace_Visual3.png?alt=media&token=53f80295-6877-441e-8a32-606460f52faa"
                className="w-full"
              />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              4. Interacting with Idea Cards
            </h3>
            <p>Each idea card has several interactive elements:</p>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <p className="font-bold">
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/CardInteraction.png?alt=media&token=cdd5c047-fce0-48e8-a787-c1f63056c79f"
                  className="w-full"
                />
              </p>
            </div>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
              <li>
                <strong>Read More:</strong> Click to expand the card and see the
                full description and reasoning.
              </li>
              <li>
                <strong>Evaluate Card:</strong> Click on the Magnifying Glass
                Icon at the bottom of the card to provide your own assessment of
                the idea's cost impact and feasibility. You can also toggle
                between your evaluation and the average score from all users.
                But this option will only be available after you place your
                evaluation. So if the Dollar sign is not there, click on
                EVALUATE CARD first.
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

const areaOptions = [
  "Bulk",
  "RM",
  "PM-Bottles",
  "PM-Labels",
  "PM - Caps",
  "HW",
  "IGMC - PrepProd",
  "IGMC - Printing Plates",
  "IGMC-SMC Others",
  "Masterdata",
  "Making",
  "Packing",
  "Inbound",
  "Outbound",
  "Quality",
  "IMPD",
  "Custo",
  "Others",
];

// --- MAIN IDEATION SPACE VIEW ---
const IdeationSpaceView: React.FC = () => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [ideasData, setIdeasData] = useState<Idea[]>([]);
  const [votesData, setVotesData] = useState<Vote[]>([]);
  const [commentsData, setCommentsData] = useState<Comment[]>([]);
  const [evaluationsData, setEvaluationsData] = useState<Evaluation[]>([]);
  const [playerTaggings, setPlayerTaggings] = useState<PlayerTagging[]>([]);
  const [filteredIdeas, setFilteredIdeas] = useState<Idea[]>([]);
  const [filter, setFilter] = useState("all");
  const [missionFilter, setMissionFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedIdeas, setSelectedIdeas] = useState<Idea[]>([]);
  const [newlyCreatedIdeaId, setNewlyCreatedIdeaId] = useState<string | null>(
    null
  );
  const [closeIdeaSharingDate, setCloseIdeaSharingDate] = useState<Date | null>(
    null
  );
  const [closeCommentingDate, setCloseCommentingDate] = useState<Date | null>(
    null
  );
  const [closeEvaluationDate, setCloseEvaluationDate] = useState<Date | null>(
    null
  );

  const now = new Date();
  const isIdeaSharingEnded = closeIdeaSharingDate
    ? now > closeIdeaSharingDate
    : false;
  const isCommentingEnded = closeCommentingDate
    ? now > closeCommentingDate
    : false;
  const isEvaluationEnded = closeEvaluationDate
    ? now > closeEvaluationDate
    : false;

  useEffect(() => {
    const fetchClosingDates = async () => {
      const datesToFetch = [
        "CloseIdeaSharingDate",
        "CloseCommentingDate",
        "CloseEvaluationDate",
      ];
      const dateSetters: { [key: string]: (date: Date) => void } = {
        CloseIdeaSharingDate: setCloseIdeaSharingDate,
        CloseCommentingDate: setCloseCommentingDate,
        CloseEvaluationDate: setCloseEvaluationDate,
      };

      for (const dateName of datesToFetch) {
        const docRef = doc(db, "closingDates", dateName);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          dateSetters[dateName](docSnap.data().date.toDate());
        }
      }
    };
    fetchClosingDates();

    const checkAdminRights = async () => {
      if (user?.email) {
        const q = query(
          collection(db, "playerDetailsCollection"),
          where("email", "==", user.email)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const playerData = querySnapshot.docs[0].data();
          if (playerData.adminRights === true) {
            setIsAdmin(true);
          }
        }
      }
    };
    checkAdminRights();
  }, [user]);

  useEffect(() => {
    const fetchIdeas = onSnapshot(collection(db, "ideas"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Idea[];
      // Default sort by creation date. Randomization will be applied later if needed.
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

    const fetchPlayerTaggings = onSnapshot(
      collection(db, "playerTaggings"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PlayerTagging[];
        setPlayerTaggings(data);
      }
    );

    return () => {
      fetchIdeas();
      fetchVotes();
      fetchComments();
      fetchEvaluations();
      fetchPlayerTaggings();
    };
  }, []);

  // Memoize the processed ideas list to either be sorted or shuffled.
  const processedIdeas = useMemo(() => {
    if (isIdeaSharingEnded) {
      // Fisher-Yates shuffle algorithm for random order on page refresh
      const shuffled = [...ideasData];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    // If idea sharing is open, return the default sorted list
    return ideasData;
  }, [ideasData, isIdeaSharingEnded]);

  useEffect(() => {
    if (!user) {
      setFilteredIdeas([]);
      return;
    }

    let newFilteredData = [...processedIdeas];

    // Scope filter (for admins)
    if (isAdmin) {
      if (scopeFilter === "inScope") {
        newFilteredData = newFilteredData.filter((idea) => !idea.outOfScope);
      } else if (scopeFilter === "outOfScope") {
        newFilteredData = newFilteredData.filter(
          (idea) => idea.outOfScope === true
        );
      }
    }

    // Area filter
    if (areaFilter !== "all") {
      newFilteredData = newFilteredData.filter((idea) =>
        idea.areas?.includes(areaFilter)
      );
    }

    // Main filter logic
    switch (filter) {
      case "userCreated":
        newFilteredData = newFilteredData.filter((s) => s.userId === user.uid);
        break;

      case "userVoted": // "Evaluated By Me"
        {
          const evaluatedIdeaIds = new Set(
            evaluationsData
              .filter((e) => e.EvaluatorUserId === user.uid)
              .map((e) => e.ideaId)
          );
          newFilteredData = newFilteredData.filter((idea) =>
            evaluatedIdeaIds.has(idea.id)
          );
        }
        break;

      case "unvoted": // "Not Evaluated By Me"
        {
          const evaluatedIdeaIds = new Set(
            evaluationsData
              .filter((e) => e.EvaluatorUserId === user.uid)
              .map((e) => e.ideaId)
          );
          newFilteredData = newFilteredData.filter(
            (idea) => !evaluatedIdeaIds.has(idea.id)
          );
        }
        break;

      case "commented":
        {
          const commentedIdeaIds = new Set(
            commentsData
              .filter((c) => c.userId === user.uid)
              .map((c) => c.ideaId)
          );
          newFilteredData = newFilteredData.filter((idea) =>
            commentedIdeaIds.has(idea.id)
          );
        }
        break;

      case "taggedIn":
        {
          const taggedIdeaIds = new Set(
            playerTaggings
              .filter((tag) => tag.taggedPlayerEmail === user.email)
              .map((tag) => tag.ideaId)
          );
          newFilteredData = newFilteredData.filter((idea) =>
            taggedIdeaIds.has(idea.id)
          );
        }
        break;

      case "taggedUncommented":
        {
          const userTaggings = playerTaggings.filter(
            (tag) => tag.taggedPlayerEmail === user.email
          );
          const taggedIdeaIds = new Set(userTaggings.map((tag) => tag.ideaId));
          const ideasToFilter = newFilteredData.filter((idea) =>
            taggedIdeaIds.has(idea.id)
          );

          newFilteredData = ideasToFilter.filter((idea) => {
            const taggingsForThisIdea = userTaggings.filter(
              (tag) => tag.ideaId === idea.id
            );
            if (taggingsForThisIdea.length === 0) return false;

            const commentsForThisIdeaByUser = commentsData.filter(
              (comment) =>
                comment.ideaId === idea.id && comment.userId === user.uid
            );

            // Find the latest tag timestamp for this user on this idea
            const latestTagTimestamp = Math.max(
              ...taggingsForThisIdea.map((t) => t.timestamp.toMillis())
            );

            // Check if there is any comment made by the user *after* the latest tag.
            const hasCommentedAfterTag = commentsForThisIdeaByUser.some(
              (comment) => {
                return comment.createdAt.toMillis() > latestTagTimestamp;
              }
            );
            // Include if the user has NOT commented after the latest tag.
            return !hasCommentedAfterTag;
          });
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
                const category = getEvaluationCategory(
                  e.ImpactScore,
                  e.FeasibilityScore
                );
                if (filter === "topVoted") return category === "green";
                if (filter === "mediumVoted") return category === "yellow";
                if (filter === "lowVoted") return category === "red";
                return false;
              })
              .map((e) => e.ideaId)
          );
          newFilteredData = newFilteredData.filter((idea) =>
            categorizedIdeaIds.has(idea.id)
          );
        }
        break;

      case "all":
      default:
        // No change, keep newFilteredData as is
        break;
    }

    // Mission filter
    if (missionFilter !== "all") {
      newFilteredData = newFilteredData.filter(
        (idea) => idea.ideationMission === missionFilter
      );
    }

    setFilteredIdeas(newFilteredData);
  }, [
    filter,
    missionFilter,
    scopeFilter,
    areaFilter,
    isAdmin,
    processedIdeas, // Use the memoized list
    commentsData,
    evaluationsData,
    playerTaggings,
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
  const handleCloseModal = (newIdeaId?: string) => {
    setIsModalOpen(false);
    setSelectedIdeas([]); // Clear selection after modal closes
    if (newIdeaId) {
      setNewlyCreatedIdeaId(newIdeaId);
    }
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

  const getBannerMessage = () => {
    if (isEvaluationEnded) {
      return "The game has ended. Thank you for your participation! You can still browse all the great ideas.";
    }
    if (isCommentingEnded) {
      return "The commenting period has closed. You can no longer share comments, but you can still evaluate ideas.";
    }
    if (isIdeaSharingEnded) {
      return "The idea sharing period has ended. You can still comment on and evaluate existing ideas.";
    }
    return null;
  };

  const bannerMessage = getBannerMessage();
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
          <span
            data-tour-id="ideation-space-filters"
            className="flex items-center gap-2"
          >
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg focus:outline-none w-full md:w-auto"
            >
              <option value="all">All Ideas</option>
              <option value="userCreated">My Ideas</option>
              <option value="commented">Commented By Me</option>
              <option value="userVoted">Evaluated By Me</option>
              <option value="unvoted">Not Evaluated By Me</option>
              <option value="taggedIn">All Ideas I'm tagged in</option>
              <option value="taggedUncommented">
                I must respond - Ideas I'm tagged in
              </option>
              <option value="topVoted">My Top Ideas</option>
              <option value="mediumVoted">My Medium Ideas</option>
              <option value="lowVoted">My Low Ideas</option>
            </select>
            <select
              value={missionFilter}
              onChange={(e) => setMissionFilter(e.target.value)}
              className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none w-full md:w-auto"
            >
              <option value="all">All Sub-Challenges</option>
              <option value="E2E Touchless Supply Chain">
                E2E Touchless Supply Chain
              </option>
              <option value="E2E Touchless Innovation">
                E2E Touchless Innovation
              </option>
              <option value="Zero Waste">Zero Waste</option>
            </select>

            {/* --- MODIFIED AREA FILTER --- */}
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg focus:outline-none w-full md:w-auto"
            >
              <option value="all">All Areas</option>
              {areaOptions.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>

            {isAdmin && (
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg focus:outline-none w-full md:w-auto ml-2"
              >
                <option value="all">All Scopes</option>
                <option value="inScope">In Scope</option>
                <option value="outOfScope">Out Of Scope</option>
              </select>
            )}
          </span>
          <button
            onClick={handleOpenModal}
            data-tour-id="ideation-space-share-idea"
            disabled={isIdeaSharingEnded}
            className={`font-semibold py-2 px-4 rounded-lg shadow-md w-full md:w-auto transition-colors duration-300 ${
              isIdeaSharingEnded
                ? "bg-gray-400 cursor-not-allowed"
                : hasSelection
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-red-500 hover:bg-red-700 text-white"
            }`}
          >
            {hasSelection ? buildButtonText : "+ Share Idea"}
          </button>
        </div>
      </div>
      {bannerMessage && (
        <div className="bg-red-500 text-white font-bold text-center p-4 mb-6 rounded-lg">
          {bannerMessage}
          <br />
          Ideas are now placed in a random order.
        </div>
      )}

      <MasonryLayout gap={40}>
        {filteredIdeas.map((item, index) => (
          <IdeaTile
            data-tour-id={index === 0 ? "idea-tile-example" : undefined}
            key={item.id}
            item={item}
            handleVote={handleVote}
            votesData={votesData}
            handleAddToBuildDeck={handleAddToBuildDeck}
            onSelect={handleSelectIdea}
            isSelected={selectedIdeas.some((i) => i.id === item.id)}
            isSelectionLocked={isSelectionLocked}
            isDarkMode={false}
            startWithEvaluationOpen={item.id === newlyCreatedIdeaId}
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

import React, { useState, useEffect, useContext } from "react";
import {
  collection,
  doc,
  setDoc,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { AuthContext } from "../../context/AuthContext";
import type { AuthContextType } from "../../context/AuthContext";
import DOMPurify from "dompurify";
import { FaThumbsUp, FaThumbsDown, FaPlus, FaEye } from "react-icons/fa";
import IdeaModal from "./IdeaModal"; // Import the IdeaModal component

// --- TYPE DEFINITIONS ---

interface Solution {
  solutionId: string;
  ideaTitle: string;
  image: string;
  shortRecap?: string;
  ideaDescription: string;
  trl: string;
  inspiration?: { title: string; imageUrl: string; type: string }[];
  inspiredIdeas?: string[];
  creationDate: Timestamp;
  userId: string;
  approved?: boolean;
  argumentsVisible?: boolean;
}

interface Vote {
  solutionId: string;
  userId: string;
  vote: "agree" | "disagree" | "cancel";
}

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

// --- SOLUTION TILE COMPONENT ---
const BBSolutionTile: React.FC<{
  item: Solution;
  handleSolutionVote: (voteType: "agree" | "disagree", item: Solution) => void;
  solutionsVotesData: Vote[];
  handleAddToBuildDeck: (card: any) => void;
}> = ({
  item,
  handleSolutionVote,
  solutionsVotesData,
  handleAddToBuildDeck,
}) => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [userVote, setUserVote] = useState<
    "agree" | "disagree" | "cancel" | false
  >(false);
  const [hasRead, setHasRead] = useState(false);
  const [readMoreVisible, setReadMoreVisible] = useState(false);
  const [solutionCreationDate, setSolutionCreationDate] = useState("");

  useEffect(() => {
    if (item.creationDate) {
      setSolutionCreationDate(
        item.creationDate.toDate().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    }

    const userVoteData = solutionsVotesData.find(
      (vote) => vote.solutionId === item.solutionId && vote.userId === user?.uid
    );
    if (userVoteData) {
      setUserVote(userVoteData.vote);
    }
  }, [item, user, solutionsVotesData]);

  const handleToggleReadStatus = () => {
    setHasRead(!hasRead);
    console.log("Toggled read status for:", item.solutionId);
  };

  return (
    <div className="bg-gray-800 text-white rounded-lg shadow-lg overflow-hidden break-words">
      <div
        className={`p-4 flex justify-between items-center ${
          item.approved ? "bg-green-500/50" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              handleAddToBuildDeck({
                cardTitle: item.ideaTitle,
                cardSubTitle: "shared Solution",
                imageUrl: item.image,
                cardType: "Idea",
                cardContent: item.ideaDescription,
                cardtrl: item.trl,
              })
            }
            className="bg-gray-700 hover:bg-gray-600 rounded-full w-8 h-8 flex items-center justify-center"
            title="Add to Build Deck"
          >
            <FaPlus />
          </button>
          <button
            onClick={handleToggleReadStatus}
            className={`rounded-full w-8 h-8 flex items-center justify-center transition-colors ${
              hasRead ? "bg-green-500" : "bg-gray-700 hover:bg-gray-600"
            }`}
            title="Mark as Read"
          >
            <FaEye />
          </button>
        </div>
        <div className="text-sm text-gray-400">{solutionCreationDate}</div>
      </div>

      <img
        src={item.image}
        alt={item.ideaTitle}
        className="w-full h-48 object-cover"
      />

      <div className="p-4">
        <h4 className="font-bold text-xl mb-2">{item.ideaTitle}</h4>
        <div className="text-gray-300">
          {readMoreVisible ? (
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(item.ideaDescription),
              }}
            />
          ) : (
            <p>{`${item.ideaDescription.substring(0, 100)}...`}</p>
          )}
          <button
            onClick={() => setReadMoreVisible(!readMoreVisible)}
            className="text-blue-400 hover:underline mt-2"
          >
            {readMoreVisible ? "Read Less" : "Read More"}
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-gray-700">
        <p className="text-center font-semibold mb-4">
          Should we move this idea forwards?
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => handleSolutionVote("agree", item)}
            className={`py-2 px-6 rounded-lg font-semibold transition-colors ${
              userVote === "agree"
                ? "bg-green-500 text-white"
                : "bg-gray-600 hover:bg-green-700"
            }`}
          >
            <FaThumbsUp className="inline mr-2" /> Yes
          </button>
          <button
            onClick={() => handleSolutionVote("disagree", item)}
            className={`py-2 px-6 rounded-lg font-semibold transition-colors ${
              userVote === "disagree"
                ? "bg-red-500 text-white"
                : "bg-gray-600 hover:bg-red-700"
            }`}
          >
            <FaThumbsDown className="inline mr-2" /> Veto
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN IDEATION SPACE VIEW ---

const IdeationSpaceView: React.FC = () => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [solutionsData, setSolutionsData] = useState<Solution[]>([]);
  const [solutionsVotesData, setSolutionsVotesData] = useState<Vote[]>([]);
  const [filteredSolutions, setFilteredSolutions] = useState<Solution[]>([]);
  const [filter, setFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchSolutions = onSnapshot(
      collection(db, "solutions"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          solutionId: doc.id,
        })) as Solution[];
        const sortedData = data.sort(
          (a, b) => b.creationDate.toMillis() - a.creationDate.toMillis()
        );
        setSolutionsData(sortedData);
      }
    );

    const fetchVotes = onSnapshot(
      collection(db, "solutionsVotes"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data()) as Vote[];
        setSolutionsVotesData(data);
      }
    );

    return () => {
      fetchSolutions();
      fetchVotes();
    };
  }, []);

  useEffect(() => {
    let newFilteredData = [...solutionsData];

    if (filter === "userCreated") {
      newFilteredData = solutionsData.filter((s) => s.userId === user?.uid);
    } else if (filter === "userVoted") {
      const votedSolutionIds = new Set(
        solutionsVotesData
          .filter((v) => v.userId === user?.uid)
          .map((v) => v.solutionId)
      );
      newFilteredData = solutionsData.filter((s) =>
        votedSolutionIds.has(s.solutionId)
      );
    }

    setFilteredSolutions(newFilteredData);
  }, [filter, solutionsData, solutionsVotesData, user]);

  const handleSolutionVote = async (
    voteType: "agree" | "disagree",
    item: Solution
  ) => {
    if (!user) return;

    const voteDocRef = doc(
      db,
      "solutionsVotes",
      `${user.uid}_${item.solutionId}`
    );
    const currentVote = solutionsVotesData.find(
      (v) => v.solutionId === item.solutionId && v.userId === user.uid
    );

    if (currentVote && currentVote.vote === voteType) {
      console.log("Toggling off vote");
    } else {
      await setDoc(voteDocRef, {
        solutionId: item.solutionId,
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
    <div className="w-full pt-[11vh] px-! md:px-20">
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
            <option value="userCreated">Your Ideas</option>
            <option value="userVoted">Voted Ideas</option>
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
        {filteredSolutions.map((item) => (
          <BBSolutionTile
            key={item.solutionId}
            item={item}
            handleSolutionVote={handleSolutionVote}
            solutionsVotesData={solutionsVotesData}
            handleAddToBuildDeck={handleAddToBuildDeck}
          />
        ))}
      </MasonryLayout>

      {isModalOpen && <IdeaModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default IdeationSpaceView;

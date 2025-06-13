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
import DOMPurify from "dompurify";
import { FaThumbsUp, FaThumbsDown, FaPlus, FaEye } from "react-icons/fa";
import IdeaModal from "./IdeaModal"; // Import the IdeaModal component

// --- TYPE DEFINITIONS ---

interface Idea {
  id: string;
  ideaTitle: string;
  imageUrl: string;
  shortDescription: string;
  reasoning: string;
  costEstimate: string;
  createdAt: Timestamp;
  userId: string;
  approved?: boolean;
  displayName: string;
}

interface Vote {
  ideaId: string;
  userId: string;
  vote: "agree" | "disagree";
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

// --- IDEA TILE COMPONENT ---
const IdeaTile: React.FC<{
  item: Idea;
  handleVote: (voteType: "agree" | "disagree", item: Idea) => void;
  votesData: Vote[];
  handleAddToBuildDeck: (card: any) => void;
}> = ({ item, handleVote, votesData, handleAddToBuildDeck }) => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [userVote, setUserVote] = useState<"agree" | "disagree" | null>(null);
  const [hasRead, setHasRead] = useState(false);
  const [readMoreVisible, setReadMoreVisible] = useState(false);
  const [creationDate, setCreationDate] = useState("");

  useEffect(() => {
    if (item.createdAt) {
      setCreationDate(
        item.createdAt.toDate().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    }

    const userVoteData = votesData.find(
      (vote) => vote.ideaId === item.id && vote.userId === user?.uid
    );
    if (userVoteData) {
      setUserVote(userVoteData.vote);
    } else {
      setUserVote(null);
    }
  }, [item, user, votesData]);

  const handleToggleReadStatus = () => {
    setHasRead(!hasRead);
  };

  const ideaDescription = `${item.shortDescription}<br/><br/><b>Feasibility Reasoning:</b><br/>${item.reasoning}`;

  return (
    <div className="bg-gray-800 text-white rounded-lg shadow-lg overflow-hidden break-words">
      <div className="bg-amber-600 p-4">
        <h4 className="font-bold text-xl text-center uppercase">
          {item.ideaTitle}
        </h4>
        <h5 className="text-sm text-center">Waste Reduction</h5>
      </div>
      <img
        src={item.imageUrl}
        alt={item.ideaTitle}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <div className="text-gray-300">
          {readMoreVisible ? (
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(ideaDescription),
              }}
            />
          ) : (
            <p>{`${item.shortDescription.substring(0, 100)}...`}</p>
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
            onClick={() => handleVote("agree", item)}
            className={`py-2 px-6 rounded-lg font-semibold transition-colors ${
              userVote === "agree"
                ? "bg-green-500 text-white"
                : "bg-gray-600 hover:bg-green-700"
            }`}
          >
            <FaThumbsUp className="inline mr-2" /> Yes
          </button>
          <button
            onClick={() => handleVote("disagree", item)}
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
      <div className="bg-amber-600">
        <div
          className={`p-4 flex justify-between items-center ${
            item.approved ? "bg-green-500/50" : ""
          }`}
        >
          <div className="text-sm text-gray-100">
            Created by {item.displayName} on {creationDate}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                handleAddToBuildDeck({
                  cardTitle: item.ideaTitle,
                  cardSubTitle: "Shared Idea",
                  imageUrl: item.imageUrl,
                  cardType: "Idea",
                  cardContent: ideaDescription,
                  cardtrl: item.costEstimate,
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
        </div>
      </div>
    </div>
  );
};

// --- MAIN IDEATION SPACE VIEW ---

const IdeationSpaceView: React.FC = () => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [ideasData, setIdeasData] = useState<Idea[]>([]);
  const [votesData, setVotesData] = useState<Vote[]>([]);
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

    return () => {
      fetchIdeas();
      fetchVotes();
    };
  }, []);

  useEffect(() => {
    let newFilteredData = [...ideasData];

    if (filter === "userCreated") {
      newFilteredData = ideasData.filter((s) => s.userId === user?.uid);
    } else if (filter === "userVoted") {
      const votedIdeaIds = new Set(
        votesData.filter((v) => v.userId === user?.uid).map((v) => v.ideaId)
      );
      newFilteredData = ideasData.filter((s) => votedIdeaIds.has(s.id));
    }

    setFilteredIdeas(newFilteredData);
  }, [filter, ideasData, votesData, user]);

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
    <div className="w-full pt-[11vh] px-4 md:px-20 text-black">
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

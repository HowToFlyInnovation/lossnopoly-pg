import React, { useState, useEffect, useContext } from "react";
import { Timestamp } from "firebase/firestore";
import DOMPurify from "dompurify";
import { FaThumbsUp, FaThumbsDown, FaPlus, FaEye } from "react-icons/fa";
import { AuthContext, type AuthContextType } from "../../context/AuthContext";

// --- TYPE DEFINITIONS ---

export interface Idea {
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

export interface Vote {
  ideaId: string;
  userId: string;
  vote: "agree" | "disagree";
}

interface IdeaTileProps {
  item: Idea;
  handleVote: (voteType: "agree" | "disagree", item: Idea) => void;
  votesData: Vote[];
  handleAddToBuildDeck: (card: any) => void;
}

// --- IDEA TILE COMPONENT ---
const IdeaTile: React.FC<IdeaTileProps> = ({
  item,
  handleVote,
  votesData,
  handleAddToBuildDeck,
}) => {
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
            <div className="flex flex-col gap-4 mb-4">
              <div
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(ideaDescription),
                }}
              />
              <div>
                <b>Cost Estimate: </b>
                {item.costEstimate}
              </div>
            </div>
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

export default IdeaTile;

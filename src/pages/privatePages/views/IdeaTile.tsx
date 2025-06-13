import React, { useState, useEffect, useContext } from "react";
import {
  Timestamp,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
} from "firebase/firestore";
import DOMPurify from "dompurify";
import { FaThumbsUp, FaThumbsDown, FaPlus, FaEye } from "react-icons/fa";
import { AuthContext, type AuthContextType } from "../../context/AuthContext";
import { db } from "../../firebase/config";

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
  email?: string;
}

export interface Vote {
  ideaId: string;
  userId: string;
  vote: "agree" | "disagree";
}

export interface Evaluation {
  id: string;
  ideaId: string;
  EvaluationDate: Timestamp;
  IdeaOwnerDisplayName: string;
  IdeaOwnerEmail?: string;
  IdeaOwnerUserId: string;
  EvaluatorDisplayName: string;
  EvaluatorEmail: string;
  EvaluatorUserId: string;
  ImpactScore: string;
  FeasibilityScore: string;
}

interface IdeaTileProps {
  item: Idea;
  handleVote: (voteType: "agree" | "disagree", item: Idea) => void;
  votesData: Vote[];
  handleAddToBuildDeck: (card: any) => void;
}

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

  const [impactScore, setImpactScore] = useState<string>("$0-$10K");
  const [feasibilityScore, setFeasibilityScore] =
    useState<string>("Very easy to do");
  const [userEvaluation, setUserEvaluation] = useState<Evaluation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New state to control evaluation form visibility
  const [isEvaluating, setIsEvaluating] = useState(false);

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
    setUserVote(userVoteData ? userVoteData.vote : null);

    if (user) {
      const evaluationDocRef = doc(db, "evaluations", `${user.uid}_${item.id}`);
      const unsubscribe = onSnapshot(evaluationDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserEvaluation({
            id: docSnap.id,
            ...docSnap.data(),
          } as Evaluation);
          setIsEvaluating(false);
        } else {
          setUserEvaluation(null);
        }
      });
      return () => unsubscribe();
    }
  }, [item, user, votesData]);

  const handleToggleReadStatus = () => {
    setHasRead(!hasRead);
  };

  const handleEvaluationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to evaluate.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const evaluationDocRef = doc(db, "evaluations", `${user.uid}_${item.id}`);
      const newEvaluation: Omit<Evaluation, "id"> = {
        ideaId: item.id,
        EvaluationDate: Timestamp.now(),
        IdeaOwnerDisplayName: item.displayName,
        IdeaOwnerEmail: item.email || "N/A",
        IdeaOwnerUserId: item.userId,
        EvaluatorDisplayName: user.displayName || "Anonymous",
        EvaluatorEmail: user.email || "N/A",
        EvaluatorUserId: user.uid,
        ImpactScore: impactScore,
        FeasibilityScore: feasibilityScore,
      };
      await setDoc(evaluationDocRef, newEvaluation);
    } catch (err) {
      console.error("Error submitting evaluation:", err);
      setError("Failed to submit evaluation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEvaluationClasses = (evaluation: Evaluation | null): string => {
    if (!evaluation) {
      return "bg-gray-800 text-white";
    }

    const impactIndex = costImpactOptions.indexOf(evaluation.ImpactScore);
    const feasibilityIndex = feasibilityOptions.indexOf(
      evaluation.FeasibilityScore
    );

    const impactScore = impactIndex + 1; // Score 1-8
    const feasibilityScore = 8 - feasibilityIndex; // Score 1-8 (inversely mapped)

    const isHighImpact = impactScore > 4;
    const isHighFeasibility = feasibilityScore > 4;

    if (isHighImpact && isHighFeasibility) {
      return "bg-green-200/50 text-gray-800"; // Top-right: High Impact, High Feasibility
    } else if (isHighImpact && !isHighFeasibility) {
      return "bg-yellow-200/50 text-gray-800"; // Top-left: High Impact, Low Feasibility
    } else if (!isHighImpact && isHighFeasibility) {
      return "bg-yellow-200/50 text-gray-800"; // Bottom-right: Low Impact, High Feasibility
    } else {
      // Low Impact, Low Feasibility
      return "bg-red-200/50 text-gray-800"; // Bottom-left: Low Impact, Low Feasibility
    }
  };

  const evaluationClasses = getEvaluationClasses(userEvaluation);
  const ideaDescription = `${item.shortDescription}<br/><br/><b>Feasibility Reasoning:</b><br/>${item.reasoning}`;

  return (
    <div
      className={`rounded-lg shadow-lg overflow-hidden break-words bg-gray-800`}
    >
      <div className="bg-amber-600 p-4">
        <h4 className="font-bold text-xl text-white text-center uppercase">
          {item.ideaTitle}
        </h4>
        <h5 className="text-sm text-center text-white">Waste Reduction</h5>
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
            className="text-blue-500 hover:underline mt-2"
          >
            {readMoreVisible ? "Read Less" : "Read More"}
          </button>
        </div>
      </div>

      {/* --- Evaluation Section --- */}
      <div className={`p-4 border-y border-gray-700 text-gray-300`}>
        {userEvaluation ? (
          <div>
            <h5 className="text-lg font-bold text-center mb-2">
              Your Evaluation
            </h5>
            <div className="flex flex-row items-center gap-2">
              <div className={`${evaluationClasses} h-10 w-10`}></div>
              <div>
                <p>
                  <strong>Cost Impact:</strong> {userEvaluation.ImpactScore}
                </p>
                <p>
                  <strong>Feasibility:</strong>{" "}
                  {userEvaluation.FeasibilityScore}
                </p>
              </div>
            </div>
          </div>
        ) : isEvaluating ? (
          <form onSubmit={handleEvaluationSubmit}>
            <h5 className="text-lg font-bold text-center mb-4">
              Evaluate This Idea
            </h5>
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <div className="mb-4">
              <label
                htmlFor={`cost-impact-${item.id}`}
                className="block mb-1 font-semibold"
              >
                Cost Impact
              </label>
              <select
                id={`cost-impact-${item.id}`}
                value={impactScore}
                onChange={(e) => setImpactScore(e.target.value)}
                className="w-full p-2 bg-gray-700 text-white rounded"
              >
                {costImpactOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label
                htmlFor={`feasibility-${item.id}`}
                className="block mb-1 font-semibold"
              >
                Feasibility
              </label>
              <select
                id={`feasibility-${item.id}`}
                value={feasibilityScore}
                onChange={(e) => setFeasibilityScore(e.target.value)}
                className="w-full p-2 bg-gray-700 text-white rounded"
              >
                {feasibilityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-monopoly-red rounded-lg hover:bg-monopoly-red-darker font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Evaluation"}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsEvaluating(true)}
            className="w-full py-3 px-4 bg-gray-900 rounded-lg hover:bg-black text-white font-bold text-lg"
          >
            Evaluate Card
          </button>
        )}
      </div>

      <div className="bg-gray-800">
        <div
          className={`p-4 flex justify-between items-center ${
            item.approved ? "bg-green-500/50" : ""
          }`}
        >
          <div className="text-xs italic text-gray-400">
            Idea shared by {item.displayName} on {creationDate}
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
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-full w-8 h-8 flex items-center justify-center"
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

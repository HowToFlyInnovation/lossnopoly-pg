import React, { useState, useEffect, useContext } from "react";
import {
  Timestamp,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import DOMPurify from "dompurify";
import { FaThumbsUp, FaPlus, FaEye, FaComment } from "react-icons/fa";
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
  ideationMission: string;
  tags: string[];
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

// New Comment Interface
export interface Comment {
  id: string;
  ideaId: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: Timestamp;
  likes: string[]; // Array of user IDs who liked the comment
  parentId: string | null; // For threading replies
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

const missionColors: { [key: string]: string } = {
  "Touchless Processes": "bg-amber-600",
  "Touchless Innovation": "bg-green-600",
  "Waste Reduction": "bg-blue-600",
};

// --- IDEA TILE COMPONENT ---
const IdeaTile: React.FC<IdeaTileProps> = ({
  item,
  handleVote,
  votesData,
  handleAddToBuildDeck,
}) => {
  const { user } = useContext(AuthContext) as AuthContextType;

  // --- EXISTING STATE ---
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
  const [isEvaluating, setIsEvaluating] = useState(false);

  // --- NEW COMMENT STATE ---
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isPostingComment, setIsPostingComment] = useState(false);

  // --- NEW EVALUATION STATE ---
  const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]);
  const [averageScores, setAverageScores] = useState<{
    impact: string;
    feasibility: string;
  } | null>(null);
  const [evaluationView, setEvaluationView] = useState<"user" | "average">(
    "user"
  );

  // --- EFFECTS ---

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
      const unsubEval = onSnapshot(evaluationDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserEvaluation({
            id: docSnap.id,
            ...docSnap.data(),
          } as Evaluation);
          setIsEvaluating(false); // Hide the form if evaluation exists
          setEvaluationView("user"); // Default to user view
        } else {
          setUserEvaluation(null);
        }
      });
      return () => unsubEval();
    }
  }, [item, user, votesData]);

  // --- New Effect for fetching all evaluations for the idea ---
  useEffect(() => {
    if (!item.id) return;

    const evaluationsQuery = query(
      collection(db, "evaluations"),
      where("ideaId", "==", item.id)
    );
    const unsubscribe = onSnapshot(evaluationsQuery, (snapshot) => {
      const fetchedEvaluations = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Evaluation)
      );
      setAllEvaluations(fetchedEvaluations);
    });

    return () => unsubscribe();
  }, [item.id]);

  // --- New Effect to calculate average scores ---
  useEffect(() => {
    if (allEvaluations.length === 0) {
      setAverageScores(null);
      return;
    }

    const getAverageLabel = (scores: string[], options: string[]): string => {
      const numericScores = scores.map((score) => options.indexOf(score));
      const validScores = numericScores.filter((s) => s !== -1);
      if (validScores.length === 0) return "N/A";
      const averageIndex = Math.round(
        validScores.reduce((a, b) => a + b, 0) / validScores.length
      );
      return options[averageIndex] || "N/A";
    };

    const impactScores = allEvaluations.map((e) => e.ImpactScore);
    const feasibilityScores = allEvaluations.map((e) => e.FeasibilityScore);

    setAverageScores({
      impact: getAverageLabel(impactScores, costImpactOptions),
      feasibility: getAverageLabel(feasibilityScores, feasibilityOptions),
    });
  }, [allEvaluations]);

  // --- New Effect for fetching comments ---
  useEffect(() => {
    if (!item.id) return;

    const commentsQuery = query(
      collection(db, "comments"),
      where("ideaId", "==", item.id),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Comment)
      );
      setComments(fetchedComments);
    });

    return () => unsubscribe();
  }, [item.id]);

  // --- HANDLERS ---

  const handleToggleReadStatus = () => setHasRead(!hasRead);

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
      await setDoc(evaluationDocRef, {
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
      });
    } catch (err) {
      setError("Failed to submit evaluation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- NEW COMMENT HANDLERS ---

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setIsPostingComment(true);
    try {
      await addDoc(collection(db, "comments"), {
        ideaId: item.id,
        userId: user.uid,
        displayName: user.displayName || "Anonymous",
        text: newComment,
        createdAt: Timestamp.now(),
        likes: [],
        parentId: replyingTo ? replyingTo.id : null,
      });
      setNewComment("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;
    const commentRef = doc(db, "comments", commentId);
    const comment = comments.find((c) => c.id === commentId);

    if (comment && comment.likes.includes(user.uid)) {
      // Unlike
      await updateDoc(commentRef, { likes: arrayRemove(user.uid) });
    } else {
      // Like
      await updateDoc(commentRef, { likes: arrayUnion(user.uid) });
    }
  };

  // --- RENDER LOGIC ---

  const getEvaluationClasses = (
    impact: string,
    feasibility: string
  ): string => {
    const impactIndex = costImpactOptions.indexOf(impact);
    const feasibilityIndex = feasibilityOptions.indexOf(feasibility);

    if (impactIndex === -1 || feasibilityIndex === -1) {
      return "bg-gray-800 text-white"; // Fallback for N/A or other errors
    }

    const impactScore = impactIndex + 1;
    const feasibilityScore = 8 - feasibilityIndex;

    const isHighImpact = impactScore > 4;
    const isHighFeasibility = feasibilityScore > 4;

    if (isHighImpact && isHighFeasibility)
      return "bg-green-200/50 text-gray-800";
    if (isHighImpact || isHighFeasibility)
      return "bg-yellow-200/50 text-gray-800";
    return "bg-red-200/50 text-gray-800";
  };

  const renderComments = (parentId: string | null = null) => {
    return comments
      .filter((comment) => comment.parentId === parentId)
      .map((comment) => (
        <div
          key={comment.id}
          className={`py-2 ${
            parentId ? "ml-6 border-l-2 border-gray-700 pl-4" : ""
          }`}
        >
          <div className="text-sm">
            <span className="font-bold text-white">{comment.displayName}</span>
            <span className="text-gray-400 ml-2">
              {comment.createdAt.toDate().toLocaleDateString()}
            </span>
          </div>
          <p className="text-gray-300 my-1">{comment.text}</p>
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => handleLikeComment(comment.id)}
              className={`flex items-center gap-1 font-semibold ${
                user && comment.likes.includes(user.uid)
                  ? "text-blue-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FaThumbsUp /> {comment.likes.length > 0 && comment.likes.length}{" "}
              Like
            </button>
            <button
              onClick={() =>
                setReplyingTo({ id: comment.id, name: comment.displayName })
              }
              className="font-semibold text-gray-400 hover:text-white"
            >
              Reply
            </button>
          </div>
          {/* Render replies recursively */}
          {renderComments(comment.id)}
        </div>
      ));
  };

  const ideaDescription = `${item.shortDescription}<br/><br/><b>Feasibility Reasoning:</b><br/>${item.reasoning}`;
  const headerColor = missionColors[item.ideationMission] || "bg-gray-600";

  return (
    <div className="rounded-lg shadow-lg overflow-hidden break-words bg-gray-800">
      {/* --- Card Header & Image --- */}
      <div className={`${headerColor} p-4`}>
        <h4 className="font-bold text-xl text-white text-center uppercase">
          {item.ideaTitle}
        </h4>
        <h5 className="text-sm text-center text-white">
          {item.ideationMission}
        </h5>
      </div>
      <img
        src={item.imageUrl}
        alt={item.ideaTitle}
        className="w-full h-48 object-cover"
      />
      {/* --- Card Body --- */}
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
              {item.tags && item.tags.length > 0 && (
                <div>
                  <b>Tags:</b>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-700 text-gray-300 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
      <div className="p-4 border-y border-gray-700 text-gray-300">
        {userEvaluation ? (
          <div>
            {/* --- NEW: Evaluation Toggle --- */}
            <div className="flex justify-start mb-4 rounded-md overflow-hidden border border-gray-600">
              <button
                onClick={() => setEvaluationView("user")}
                className={`px-3 py-1 text-sm font-semibold transition-colors w-1/2 ${
                  evaluationView === "user"
                    ? "bg-red-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Your Evaluation
              </button>
              <button
                onClick={() => setEvaluationView("average")}
                className={`px-3 py-1 text-sm font-semibold transition-colors w-1/2 ${
                  evaluationView === "average"
                    ? "bg-red-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Average ({allEvaluations.length})
              </button>
            </div>

            {/* --- User Evaluation View --- */}
            {evaluationView === "user" && (
              <div>
                <h5 className="text-lg font-bold text-center mb-2">
                  Your Evaluation
                </h5>
                <div className="flex flex-row items-center gap-2">
                  <div
                    className={`${getEvaluationClasses(
                      userEvaluation.ImpactScore,
                      userEvaluation.FeasibilityScore
                    )} h-10 w-10`}
                  ></div>
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
            )}

            {/* --- Average Evaluation View --- */}
            {evaluationView === "average" &&
              averageScores &&
              allEvaluations.length > 0 && (
                <div>
                  <h5 className="text-lg font-bold text-center mb-2">
                    Average Evaluation
                  </h5>
                  <div className="flex flex-row items-center gap-2">
                    <div
                      className={`${getEvaluationClasses(
                        averageScores.impact,
                        averageScores.feasibility
                      )} h-10 w-10`}
                    ></div>
                    <div>
                      <p>
                        <strong>Cost Impact:</strong> {averageScores.impact}
                      </p>
                      <p>
                        <strong>Feasibility:</strong>{" "}
                        {averageScores.feasibility}
                      </p>
                    </div>
                  </div>
                </div>
              )}
          </div>
        ) : isEvaluating ? (
          <form onSubmit={handleEvaluationSubmit}>
            <h5 className="text-lg font-bold text-center mb-4">
              Evaluate This Idea
            </h5>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Cost Impact</label>
              <select
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
              <label className="block mb-1 font-semibold">Feasibility</label>
              <select
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
              className="w-full py-2 px-4 bg-red-500 rounded-lg hover:bg-red-700 font-semibold"
              disabled={isSubmitting}
            >
              Submit Evaluation
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

      {/* --- Footer & Actions --- */}
      <div className="bg-gray-800">
        <div className="p-4 flex justify-between items-center">
          <div className="text-xs italic text-gray-400">
            By {item.displayName} on {creationDate}
          </div>
          <div className="flex items-center gap-2">
            {/* --- NEW COMMENT BUTTON --- */}
            <button
              onClick={() => setCommentsVisible(!commentsVisible)}
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-full w-8 h-8 flex items-center justify-center"
              title="Comments"
            >
              <FaComment />
            </button>
            <button
              onClick={() =>
                handleAddToBuildDeck({
                  /* ...props... */
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

      {/* --- NEW COMMENT SECTION --- */}
      {commentsVisible && (
        <div className="p-4 border-t border-gray-700">
          <h4 className="font-bold text-lg text-white mb-2">
            Comments ({comments.length})
          </h4>
          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="mb-4">
            {replyingTo && (
              <div className="text-sm text-gray-400 mb-2">
                Replying to {replyingTo.name}{" "}
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-red-500"
                >
                  [Cancel]
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={
                  user ? "Add a comment..." : "Please log in to comment"
                }
                className="w-full p-2 bg-gray-700 text-white rounded"
                disabled={!user || isPostingComment}
              />
              <button
                type="submit"
                className="py-2 px-4 bg-red-500 rounded-lg hover:bg-red-700 font-semibold disabled:bg-gray-500"
                disabled={!user || isPostingComment || !newComment.trim()}
              >
                {isPostingComment ? "..." : "Post"}
              </button>
            </div>
          </form>

          {/* Comment List */}
          <div className="max-h-60 overflow-y-auto pr-2">
            {renderComments(null)}
          </div>
        </div>
      )}
    </div>
  );
};

export default IdeaTile;

// src/pages/privatePages/views/IdeaTile.tsx
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
  getDocs as firestoreGetDocs, // Renamed to avoid conflict
} from "firebase/firestore";
import DOMPurify from "dompurify";
import {
  FaThumbsUp,
  FaRobot,
  FaComment,
  FaLightbulb,
  FaStar,
} from "react-icons/fa"; // Added FaStar import
import { PiLegoBold } from "react-icons/pi";
import { AuthContext, type AuthContextType } from "../../context/AuthContext";
import { db } from "../../firebase/config";

// Define the structure of a player from inviteList
interface InvitedPlayer {
  email: string;
  firstName: string;
  lastName: string;
  team: string;
  location: string;
  organization: string;
}

// --- TYPE DEFINITIONS ---

export interface Idea {
  id: string;
  ideaNumber: number;
  ideaTitle: string;
  imageUrl: string;
  shortDescription: string;
  reasoning: string;
  costEstimate: string;
  feasibilityEstimate: string; // Added feasibilityEstimate
  createdAt: Timestamp;
  userId: string;
  approved?: boolean;
  displayName: string;
  email?: string;
  ideationMission: string;
  tags: string[];
  inspiredBy?: {
    id: string;
    ideaTitle: string;
    imageUrl: string;
    ideaNumber: number;
  }[];
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

export interface Comment {
  id: string;
  ideaId: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: Timestamp;
  likes: string[];
  parentId: string | null;
}

interface IdeaTileProps {
  item: Idea;
  handleVote: (voteType: "agree" | "disagree", item: Idea) => void;
  votesData: Vote[];
  handleAddToBuildDeck: (card: any) => void;
  onSelect: (item: Idea) => void;
  isSelected: boolean;
  isSelectionLocked: boolean;
  isDarkMode: boolean; // New prop for dark mode
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
  "Impossible to pull off",
  "Borderline impossible",
  "Very difficult to execute",
  "Challenging to accomplish",
  "Doable, but requires significant effort",
  "Moderately easy",
  "Straightforward to implement",
  "Very easy to do",
];

const missionColors: { [key: string]: string } = {
  "E2E Touchless Supply Chain": "bg-amber-300",
  "E2E Touchless Innovation": "bg-amber-600",
  "Zero Waste": "bg-blue-400",
};

// --- IDEA TILE COMPONENT ---
const IdeaTile: React.FC<IdeaTileProps> = ({
  item,
  handleVote,
  votesData,
  handleAddToBuildDeck,
  onSelect,
  isSelected,
  isSelectionLocked,
  isDarkMode, // Destructure new prop
}) => {
  const { user } = useContext(AuthContext) as AuthContextType;

  // --- STATE ---
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
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]);
  const [averageScores, setAverageScores] = useState<{
    impact: string;
    feasibility: string;
  } | null>(null);
  const [evaluationView, setEvaluationView] = useState<"user" | "average">(
    "user"
  );
  const [inspiredByVisible, setInspiredByVisible] = useState(false);

  // New state to control visibility of evaluation form/details panel
  const [evaluationVisible, setEvaluationVisible] = useState(false);

  // New states for mention feature in comments
  const [allInvitedPlayers, setAllInvitedPlayers] = useState<InvitedPlayer[]>(
    []
  );
  const [commentSuggestions, setCommentSuggestions] = useState<InvitedPlayer[]>(
    []
  );

  // Fetch invited players on component mount
  useEffect(() => {
    const fetchInvitedPlayers = async () => {
      try {
        const querySnapshot = await firestoreGetDocs(
          collection(db, "inviteList")
        );
        const players: InvitedPlayer[] = querySnapshot.docs.map((doc) => ({
          email: doc.data().email,
          firstName: doc.data().firstName,
          lastName: doc.data().lastName,
          team: doc.data().team,
          location: doc.data().location,
          organization: doc.data().organization,
        }));
        setAllInvitedPlayers(players);
      } catch (err) {
        console.error("Error fetching invited players:", err);
      }
    };
    fetchInvitedPlayers();
  }, []);

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
        } else {
          setUserEvaluation(null);
        }
      });
      return () => unsubEval();
    }
  }, [item, user, votesData]);

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

    const getAvgFeasibility = (scores: string[]): string => {
      const numericScores = scores.map((score) =>
        feasibilityOptions.indexOf(score)
      );
      const validScores = numericScores.filter((s) => s !== -1);
      if (validScores.length === 0) return "N/A";
      const averageIndex = Math.round(
        validScores.reduce((a, b) => a + b, 0) / validScores.length
      );
      return feasibilityOptions[averageIndex] || "N/A";
    };

    setAverageScores({
      impact: getAverageLabel(impactScores, costImpactOptions),
      feasibility: getAvgFeasibility(feasibilityScores),
    });
  }, [allEvaluations]);

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

  // --- RENDER LOGIC AND HANDLERS ---
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
      console.error("Error submitting evaluation:", err);
      setError("Failed to submit evaluation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const extractMentions = (text: string): InvitedPlayer[] => {
    const mentions: InvitedPlayer[] = [];
    // Regex to find @ followed by First Name Last Name (handles multiple words in name)
    const mentionRegex = /@([a-zA-Z]+\s[a-zA-Z]+(?:\s[a-zA-Z]+)*)/g;
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedName = match[1].trim();
      // Try to find a player whose full name matches the mentioned name
      const foundPlayer = allInvitedPlayers.find(
        (player) =>
          `${player.firstName} ${player.lastName}`.toLowerCase() ===
          mentionedName.toLowerCase()
      );
      if (foundPlayer && !mentions.some((m) => m.email === foundPlayer.email)) {
        mentions.push(foundPlayer);
      }
    }
    return mentions;
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setIsPostingComment(true);
    try {
      const commentDocRef = await addDoc(collection(db, "comments"), {
        ideaId: item.id,
        userId: user.uid,
        displayName: user.displayName || "Anonymous",
        text: newComment,
        createdAt: Timestamp.now(),
        likes: [],
        parentId: replyingTo ? replyingTo.id : null,
      });

      // Store player taggings for the comment
      const mentionsInComment = extractMentions(newComment);
      for (const player of mentionsInComment) {
        await addDoc(collection(db, "playerTaggings"), {
          commentId: commentDocRef.id,
          ideaId: item.id,
          commentText: newComment,
          taggedPlayerDisplayName: `${player.firstName} ${player.lastName}`,
          taggedPlayerEmail: player.email,
          timestamp: Timestamp.now(),
          type: "comment", // Indicates this tagging is from a comment
        });
      }

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
      await updateDoc(commentRef, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(commentRef, { likes: arrayUnion(user.uid) });
    }
  };

  const getEvaluationClasses = (
    impact: string,
    feasibility: string
  ): string => {
    const impactIndex = costImpactOptions.indexOf(impact);
    const feasibilityIndex = feasibilityOptions.indexOf(feasibility);

    if (impactIndex === -1 || feasibilityIndex === -1) {
      return isDarkMode
        ? "bg-gray-700 text-white"
        : "bg-gray-200 text-gray-800";
    }

    const impactScore = impactIndex + 1;
    const feasibilityScore = feasibilityIndex + 1;
    const isHighImpact = impactScore > 4;
    const isHighFeasibility = feasibilityScore > 4;

    if (isDarkMode) {
      if (isHighImpact && isHighFeasibility) return "bg-green-700 text-white";
      if (isHighImpact || isHighFeasibility) return "bg-yellow-700 text-white";
      return "bg-red-700 text-white";
    } else {
      if (isHighImpact && isHighFeasibility)
        return "bg-green-200 text-gray-800";
      if (isHighImpact || isHighFeasibility)
        return "bg-yellow-200 text-gray-800";
      return "bg-red-200 text-gray-800";
    }
  };

  const highlightMentions = (text: string) => {
    // Regex to highlight only the first @ followed by First Name Last Name
    const mentionRegex = /@([a-zA-Z]+\s[a-zA-Z]+(?:\s[a-zA-Z]+)*)/;
    const match = text.match(mentionRegex);

    if (match) {
      const highlightedPart = `<span class="text-blue-500 font-bold">${match[0]}</span>`;
      return text.replace(mentionRegex, highlightedPart);
    }
    return text;
  };

  const handleCommentInputChangeWithMention = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const text = e.target.value;
    setNewComment(text);

    const atIndex = text.lastIndexOf("@");
    if (atIndex > -1) {
      const searchTerm = text.substring(atIndex + 1).toLowerCase();
      // Filter by first name, last name, or combined name for suggestions
      const filtered = allInvitedPlayers.filter(
        (player) =>
          player.firstName.toLowerCase().includes(searchTerm) ||
          player.lastName.toLowerCase().includes(searchTerm) ||
          `${player.firstName} ${player.lastName}`
            .toLowerCase()
            .includes(searchTerm)
      );
      setCommentSuggestions(filtered);
    } else {
      setCommentSuggestions([]);
    }
  };

  const handleSelectCommentSuggestion = (player: InvitedPlayer) => {
    const atIndex = newComment.lastIndexOf("@");
    if (atIndex > -1) {
      const newText =
        newComment.substring(0, atIndex) +
        `@${player.firstName} ${player.lastName} `;
      setNewComment(newText);
      setCommentSuggestions([]);
    }
  };

  const renderComments = (parentId: string | null = null) => {
    return comments
      .filter((comment) => comment.parentId === parentId)
      .map((comment) => (
        <div
          key={comment.id}
          className={`py-2 ${
            parentId
              ? `ml-6 border-l-2 ${
                  isDarkMode ? "border-gray-600" : "border-gray-400"
                } pl-4`
              : ""
          }`}
        >
          <div className="text-sm">
            <span
              className={`font-bold ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {comment.displayName}
            </span>
            <span
              className={`ml-2 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {comment.createdAt.toDate().toLocaleDateString()}
            </span>
          </div>
          <p
            className={`${isDarkMode ? "text-gray-300" : "text-gray-700"} my-1`}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(highlightMentions(comment.text)),
            }}
          ></p>
          <div
            className={`flex items-center gap-4 text-xs ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <button
              onClick={() => handleLikeComment(comment.id)}
              className={`flex items-center gap-1 font-semibold ${
                user && comment.likes.includes(user.uid)
                  ? "text-blue-500"
                  : `hover:text-blue-600 ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`
              }`}
            >
              <FaThumbsUp /> {comment.likes.length > 0 && comment.likes.length}{" "}
              Like
            </button>
            <button
              onClick={() =>
                setReplyingTo({ id: comment.id, name: comment.displayName })
              }
              className={`font-semibold hover:text-blue-600 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Reply
            </button>
          </div>
          {renderComments(comment.id)}
        </div>
      ));
  };

  const headerColor = missionColors[item.ideationMission] || "bg-gray-600";

  return (
    <>
      <div
        className={`rounded-sm shadow-xl relative overflow-hidden break-words border-12  transition-all duration-300 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } ${isSelected ? "border-green-500" : "border-white"}`}
      >
        {item.inspiredBy && item.inspiredBy.length > 0 && (
          <button
            onClick={() => setInspiredByVisible(true)}
            className="bg-gray-700/60 absolute top-2 right-2 hover:bg-yellow-600 text-white rounded-full w-8 h-8 flex items-center justify-center"
            title="Inspired by other ideas"
          >
            <FaLightbulb />
          </button>
        )}
        <div className={`${headerColor} py-5 px-6`}>
          <h4 className="font-extrabold text-[18px] text-black text-center uppercase">
            {`#${item.ideaNumber} ${item.ideaTitle}`}
          </h4>
          <h5 className="text-base font-semibold text-center text-black">
            {item.ideationMission}
          </h5>
        </div>
        <img
          src={item.imageUrl}
          alt={item.ideaTitle}
          className="w-full h-48 object-cover"
        />

        {/* --- Card Body --- */}
        <div
          className={`p-6 ${
            isDarkMode ? "text-gray-300 " : "text-gray-800 bg-gray-100/20"
          }`}
        >
          <div>
            {readMoreVisible ? (
              <div className="flex flex-col gap-4 mb-4">
                <div>{item.shortDescription}</div>
                <div className="mb-0">
                  <b>Cost Saving Estimate: </b>
                  {item.costEstimate}
                </div>
                <div className="mb-0">
                  <b>Feasibility Estimate: </b>
                  {item.feasibilityEstimate}
                </div>
                <div>
                  <b>Barriers to overcome: </b>
                  {item.reasoning}
                </div>
                {item.tags && item.tags.length > 0 && (
                  <div>
                    <b>People to involve:</b>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`${
                            isDarkMode
                              ? "bg-gray-700 text-gray-300"
                              : "bg-gray-200 text-gray-700"
                          } text-sm font-semibold px-3 py-1 rounded-full`}
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
              className="text-blue-600 hover:underline mt-2"
            >
              {readMoreVisible ? "Read Less" : "Read More"}
            </button>
          </div>
        </div>

        {/* --- Evaluation Trigger Section --- */}
        <div
          className={`p-4 border-y ${
            isDarkMode ? "border-gray-700" : "border-gray-300"
          } ${isDarkMode ? "text-gray-300" : "text-gray-800"}`}
        >
          {userEvaluation ? null : ( // If already evaluated, this section is empty as the icon moves to the action bar
            // If not evaluated by the user, show the full "Evaluate Card" button
            <button
              onClick={() => setEvaluationVisible(true)} // Show the form to evaluate
              className="w-full py-3 px-4 bg-gray-700 rounded-lg hover:bg-gray-800 text-white font-bold text-lg"
              title="Evaluate Card"
            >
              Evaluate Card
            </button>
          )}
        </div>

        {/* --- Action Buttons Section (bottom bar) --- */}
        <div className={isDarkMode ? "bg-gray-800" : "bg-white"}>
          <div className="p-4 flex justify-between items-center">
            <div
              className={`text-xs italic ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              By {item.displayName} on {creationDate}
            </div>
            <div className="flex items-center gap-2">
              {userEvaluation && ( // Only show if already rated
                <button
                  onClick={() => setEvaluationVisible(!evaluationVisible)}
                  className={`rounded-full w-8 h-8 flex items-center justify-center transition-colors
                    ${
                      getEvaluationClasses(
                        userEvaluation.ImpactScore,
                        userEvaluation.FeasibilityScore
                      ).split(" ")[0]
                    }
                    ${
                      getEvaluationClasses(
                        userEvaluation.ImpactScore,
                        userEvaluation.FeasibilityScore
                      ).split(" ")[1]
                    }
                    `}
                  title="Toggle Evaluation Details"
                >
                  <FaStar
                    className={isDarkMode ? "text-white" : "text-gray-800"}
                  />
                </button>
              )}
              <button
                onClick={() => setCommentsVisible(!commentsVisible)}
                className={`${
                  isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                } rounded-full w-8 h-8 flex items-center justify-center`}
                title="Comments"
              >
                <FaComment />
              </button>
              <button
                onClick={() => onSelect(item)}
                className={`rounded-full w-8 h-8 flex items-center justify-center transition-colors ${
                  isSelected
                    ? "bg-green-500 text-white"
                    : isSelectionLocked
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : `${
                        isDarkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      }`
                }`}
                title={
                  isSelectionLocked && !isSelected
                    ? "Max selection reached"
                    : "Select Idea"
                }
                disabled={isSelectionLocked && !isSelected}
              >
                <PiLegoBold />
              </button>
              <button
                onClick={() => handleToggleReadStatus()}
                className={`rounded-full w-8 h-8 flex items-center justify-center transition-colors ${
                  hasRead ? "bg-green-500" : "bg-gray-700 hover:bg-gray-800"
                } text-white`}
                title="Mark as Read"
              >
                <FaRobot />
              </button>
            </div>
          </div>
        </div>

        {/* --- Comments Section (opens below) --- */}
        {commentsVisible && (
          <div
            className={`p-4 border-t ${
              isDarkMode ? "border-gray-700" : "border-gray-300"
            } ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}
          >
            <h4
              className={`font-bold text-lg mb-2 ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              Comments ({comments.length})
            </h4>
            <form onSubmit={handleCommentSubmit} className="mb-4 relative">
              {replyingTo && (
                <div
                  className={`text-sm mb-2 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
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
                  onChange={handleCommentInputChangeWithMention}
                  placeholder={
                    user ? "Add a comment..." : "Please log in to comment"
                  }
                  className={`w-full p-2 rounded ${
                    isDarkMode
                      ? "bg-gray-700 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                  disabled={!user || isPostingComment}
                />
                <button
                  type="submit"
                  className="py-2 px-4 bg-red-500 rounded-lg hover:bg-red-700 text-white font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={!user || isPostingComment || !newComment.trim()}
                >
                  {isPostingComment ? "..." : "Post"}
                </button>
              </div>
              {commentSuggestions.length > 0 && (
                <ul
                  className={`absolute z-10 w-full rounded-b-md max-h-40 overflow-y-auto mt-1 ${
                    isDarkMode
                      ? "bg-gray-700 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {commentSuggestions.map((player) => (
                    <li
                      key={player.email}
                      onMouseDown={() => handleSelectCommentSuggestion(player)}
                      className={`p-2 cursor-pointer ${
                        isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-300"
                      }`}
                    >
                      {player.firstName} {player.lastName}
                    </li>
                  ))}
                </ul>
              )}
            </form>
            <div className="max-h-60 overflow-y-auto pr-2">
              {renderComments(null)}
            </div>
          </div>
        )}

        {/* --- Evaluation Content Section (opens below, similar to comments) --- */}
        {evaluationVisible && (
          <div
            className={`p-4 border-t ${
              isDarkMode ? "border-gray-700" : "border-gray-300"
            } ${isDarkMode ? "bg-gray-900" : "bg-gray-100"} ${
              isDarkMode ? "text-gray-300" : "text-gray-800"
            }`}
          >
            {userEvaluation ? (
              // Display user/average evaluation
              <div>
                <div
                  className={`flex justify-start mb-4 rounded-md overflow-hidden border ${
                    isDarkMode ? "border-gray-700" : "border-gray-300"
                  }`}
                >
                  <button
                    onClick={() => setEvaluationView("user")}
                    className={`px-3 py-1 text-sm font-semibold transition-colors w-1/2 ${
                      evaluationView === "user"
                        ? `${
                            isDarkMode
                              ? "bg-gray-700 text-white"
                              : "bg-gray-200 text-gray-800"
                          }`
                        : `${
                            isDarkMode
                              ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                              : "bg-white text-gray-600 hover:bg-gray-50"
                          }`
                    }`}
                  >
                    Your Evaluation
                  </button>
                  <button
                    onClick={() => setEvaluationView("average")}
                    className={`px-3 py-1 text-sm font-semibold transition-colors w-1/2 ${
                      evaluationView === "average"
                        ? `${
                            isDarkMode
                              ? "bg-gray-700 text-white"
                              : "bg-gray-200 text-gray-800"
                          }`
                        : `${
                            isDarkMode
                              ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                              : "bg-white text-gray-600 hover:bg-gray-50"
                          }`
                    }`}
                  >
                    Average ({allEvaluations.length})
                  </button>
                </div>
                {evaluationView === "user" && userEvaluation && (
                  <div>
                    <h5
                      className={`text-lg font-bold text-center mb-2 ${
                        isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      Your Evaluation
                    </h5>
                    <div className="flex flex-row items-center gap-2 justify-center">
                      <div
                        className={`${getEvaluationClasses(
                          userEvaluation.ImpactScore,
                          userEvaluation.FeasibilityScore
                        )} h-10 w-10 rounded-full flex items-center justify-center`}
                      >
                        <FaStar
                          className={
                            isDarkMode ? "text-white" : "text-gray-800"
                          }
                        />
                      </div>
                      <div>
                        <p>
                          <strong>Cost Impact:</strong>{" "}
                          {userEvaluation.ImpactScore}
                        </p>
                        <p>
                          <strong>Feasibility:</strong>{" "}
                          {userEvaluation.FeasibilityScore}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {evaluationView === "average" &&
                  averageScores &&
                  allEvaluations.length > 0 && (
                    <div>
                      <h5
                        className={`text-lg font-bold text-center mb-2 ${
                          isDarkMode ? "text-white" : "text-gray-800"
                        }`}
                      >
                        Average Evaluation
                      </h5>
                      <div className="flex flex-row items-center gap-2 justify-center">
                        <div
                          className={`${getEvaluationClasses(
                            averageScores.impact,
                            averageScores.feasibility
                          )} h-10 w-10 rounded-full flex items-center justify-center`}
                        >
                          <FaStar
                            className={
                              isDarkMode ? "text-white" : "text-gray-800"
                            }
                          />
                        </div>
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
            ) : (
              // Show evaluation form
              <form onSubmit={handleEvaluationSubmit}>
                <h5
                  className={`text-lg font-bold text-center mb-4 ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  Evaluate This Idea
                </h5>
                <div className="mb-4">
                  <label className="block mb-1 font-semibold">
                    Cost Impact
                  </label>
                  <select
                    value={impactScore}
                    onChange={(e) => setImpactScore(e.target.value)}
                    className={`w-full p-2 rounded ${
                      isDarkMode
                        ? "bg-gray-700 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {costImpactOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block mb-1 font-semibold">
                    Feasibility
                  </label>
                  <select
                    value={feasibilityScore}
                    onChange={(e) => setFeasibilityScore(e.target.value)}
                    className={`w-full p-2 rounded ${
                      isDarkMode
                        ? "bg-gray-700 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
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
                  className="w-full py-2 px-4 bg-red-500 rounded-lg hover:bg-red-700 text-white font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Evaluation"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {inspiredByVisible && item.inspiredBy && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
          onClick={() => setInspiredByVisible(false)}
        >
          <div
            className="bg-gray-800 text-white p-6 rounded-lg shadow-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">Inspired By</h3>
            <div className="flex flex-col gap-4">
              {item.inspiredBy.map((idea) => (
                <div key={idea.id} className="flex items-center gap-4">
                  <img
                    src={idea.imageUrl}
                    alt={idea.ideaTitle}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                  <span className="font-semibold">
                    #{idea.ideaNumber}: {idea.ideaTitle}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setInspiredByVisible(false)}
              className="mt-6 w-full py-2 px-4 bg-red-500 rounded-lg hover:bg-red-700 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default IdeaTile;

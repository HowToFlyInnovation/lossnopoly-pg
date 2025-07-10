// src/pages/privatePages/views/IdeaTile.tsx
import React, { useState, useEffect, useContext, useRef } from "react";
import {
  Timestamp,
  doc,
  setDoc,
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
  writeBatch,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import storage functions
import DOMPurify from "dompurify";
import {
  FaThumbsUp,
  FaComment,
  FaLightbulb,
  FaSearchDollar,
  FaPen,
  FaTimes, // Import the X icon
} from "react-icons/fa";
import { PiLegoBold } from "react-icons/pi";
import { AuthContext, type AuthContextType } from "../../context/AuthContext";
import { db } from "../../firebase/config";
import {
  costImpactOptions,
  feasibilityOptions,
  GAME_END_DATE,
} from "../../../lib/constants";

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
  feasibilityEstimate: string;
  createdAt: Timestamp;
  userId: string;
  approved?: boolean;
  displayName: string;
  email?: string;
  ideationMission: string;
  tags: string[];
  areas?: string[];
  whatIsNeeded?: string[];
  inspiredBy?: {
    id: string;
    ideaTitle: string;
    imageUrl: string;
    ideaNumber: number;
  }[];
  outOfScope?: boolean; // Added outOfScope field
  isNew?: boolean;
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
  editedAt?: Timestamp;
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
  isDarkMode: boolean;
  "data-tour-id"?: string;
  startWithEvaluationOpen?: boolean;
}

const missionColors: { [key: string]: string } = {
  "E2E Touchless Supply Chain": "bg-amber-300",
  "E2E Touchless Innovation": "bg-amber-600",
  "Zero Waste": "bg-blue-400",
};

// --- IDEA TILE COMPONENT ---
const IdeaTile: React.FC<IdeaTileProps> = ({
  item,
  votesData,
  onSelect,
  isSelected,
  isSelectionLocked,
  isDarkMode,
  "data-tour-id": dataTourId,
  startWithEvaluationOpen = false,
}) => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [isAdmin, setIsAdmin] = useState(false);
  const isGameEnded = new Date() > GAME_END_DATE;

  // --- STATE ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [, setUserVote] = useState<"agree" | "disagree" | null>(null);
  const [readMoreVisible, setReadMoreVisible] = useState(false);
  const [creationDate, setCreationDate] = useState("");
  const [impactScore, setImpactScore] = useState<string>(costImpactOptions[1]);
  const [feasibilityScore, setFeasibilityScore] = useState<string>(
    feasibilityOptions[0]
  );
  const [userEvaluation, setUserEvaluation] = useState<Evaluation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentText, setEditedCommentText] = useState("");
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
  const [evaluationVisible, setEvaluationVisible] = useState(false);
  const [allInvitedPlayers, setAllInvitedPlayers] = useState<InvitedPlayer[]>(
    []
  );
  const [commentSuggestions, setCommentSuggestions] = useState<InvitedPlayer[]>(
    []
  );
  const [editedCommentSuggestions, setEditedCommentSuggestions] = useState<
    InvitedPlayer[]
  >([]);

  // --- Creator Check ---
  const isCreator = user?.uid === item.userId;

  useEffect(() => {
    const checkAdminRights = async () => {
      if (user?.email) {
        const docSnap = await firestoreGetDocs(
          query(
            collection(db, "playerDetailsCollection"),
            where("email", "==", user.email)
          )
        );
        if (!docSnap.empty) {
          const adminData = docSnap.docs[0].data();
          if (adminData.adminRights === true) {
            setIsAdmin(true);
          }
        }
      }
    };
    checkAdminRights();
  }, [user]);

  useEffect(() => {
    if (startWithEvaluationOpen) {
      setEvaluationVisible(true);
    }
  }, [startWithEvaluationOpen]);

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

    setAverageScores({
      impact: getAverageLabel(impactScores, costImpactOptions),
      feasibility: getAverageLabel(feasibilityScores, feasibilityOptions),
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

  const handleEditPictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file (e.g., JPG, PNG, GIF).");
        return;
      }
      setIsUploading(true);
      const storage = getStorage();
      const storageRef = ref(storage, `ideas/${item.id}/${file.name}`);
      try {
        await uploadBytes(storageRef, file);
        const newImageUrl = await getDownloadURL(storageRef);

        const ideaDocRef = doc(db, "ideas", item.id);
        await updateDoc(ideaDocRef, { imageUrl: newImageUrl });
      } catch (error) {
        console.error("Error updating image:", error);
        alert("Failed to update image. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }
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
          commentOwnerId: user.uid,
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

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditedCommentText(comment.text);
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!user) return;

    const commentRef = doc(db, "comments", commentId);
    try {
      // Update comment text and timestamp
      await updateDoc(commentRef, {
        text: editedCommentText,
        editedAt: Timestamp.now(),
      });

      // Manage player taggings
      const existingTaggingsQuery = query(
        collection(db, "playerTaggings"),
        where("commentId", "==", commentId)
      );
      const existingTaggingsSnapshot = await firestoreGetDocs(
        existingTaggingsQuery
      );
      const existingTaggings = existingTaggingsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const newMentions = extractMentions(editedCommentText);
      const newMentionEmails = newMentions.map((p) => p.email);
      const existingMentionEmails = existingTaggings.map(
        (t: any) => t.taggedPlayerEmail
      );

      const batch = writeBatch(db);

      // Remove old taggings
      existingTaggings.forEach((tagging: any) => {
        if (!newMentionEmails.includes(tagging.taggedPlayerEmail)) {
          const taggingRef = doc(db, "playerTaggings", tagging.id);
          batch.delete(taggingRef);
        }
      });

      // Add new taggings
      newMentions.forEach((player) => {
        if (!existingMentionEmails.includes(player.email)) {
          const newTaggingRef = doc(collection(db, "playerTaggings"));
          batch.set(newTaggingRef, {
            commentId: commentId,
            ideaId: item.id,
            commentText: editedCommentText,
            taggedPlayerDisplayName: `${player.firstName} ${player.lastName}`,
            taggedPlayerEmail: player.email,
            timestamp: Timestamp.now(),
            type: "comment",
            commentOwnerId: user.uid,
          });
        }
      });

      await batch.commit();

      setEditingCommentId(null);
      setEditedCommentText("");
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const getEvaluationClasses = (
    impact: string,
    feasibility: string
  ): string => {
    const impactIndex = costImpactOptions.indexOf(impact);
    // For feasibility, a lower index is better.
    const feasibilityIndex = feasibilityOptions.indexOf(feasibility);

    if (impactIndex === -1 || feasibilityIndex === -1) {
      return isDarkMode
        ? "bg-gray-700 text-white"
        : "bg-gray-200 text-gray-800";
    }

    // A score is considered "high" if it's in the better half of the scale.
    const isHighImpact =
      impactIndex >= Math.floor(costImpactOptions.length / 2);
    const isHighFeasibility =
      feasibilityIndex < Math.ceil(feasibilityOptions.length / 2);

    if (isDarkMode) {
      if (isHighImpact && isHighFeasibility) return "bg-green-700 text-white";
      if (isHighImpact || isHighFeasibility) return "bg-yellow-700 text-white";
      return "bg-red-700 text-white";
    } else {
      if (isHighImpact && isHighFeasibility)
        return "bg-green-200 text-green-800";
      if (isHighImpact || isHighFeasibility)
        return "bg-yellow-200 text-yellow-800";
      return "bg-red-200 text-red-800";
    }
  };

  const highlightMentions = (text: string) => {
    // Regex to highlight all occurrences of @ followed by First Name Last Name
    const mentionRegex = /@([a-zA-Z]+\s[a-zA-Z]+(?:\s[a-zA-Z]+)*)/g;
    return text.replace(
      mentionRegex,
      '<span class="text-blue-500 font-bold">$&</span>'
    );
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

  const handleEditedCommentInputChangeWithMention = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const text = e.target.value;
    setEditedCommentText(text);

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
      setEditedCommentSuggestions(filtered);
    } else {
      setEditedCommentSuggestions([]);
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

  const handleSelectEditedCommentSuggestion = (player: InvitedPlayer) => {
    const atIndex = editedCommentText.lastIndexOf("@");
    if (atIndex > -1) {
      const newText =
        editedCommentText.substring(0, atIndex) +
        `@${player.firstName} ${player.lastName} `;
      setEditedCommentText(newText);
      setEditedCommentSuggestions([]);
    }
  };

  const toggleOutOfScope = async () => {
    if (!isAdmin) return;
    const ideaRef = doc(db, "ideas", item.id);
    try {
      await updateDoc(ideaRef, {
        outOfScope: !item.outOfScope,
      });
    } catch (error) {
      console.error("Error toggling out of scope:", error);
    }
  };

  const toggleIsNew = async () => {
    if (!isAdmin) return;
    const ideaRef = doc(db, "ideas", item.id);
    try {
      await updateDoc(ideaRef, {
        isNew: !item.isNew,
      });
    } catch (error) {
      console.error("Error toggling isNew:", error);
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
              Comment
            </span>
            <span
              className={`ml-2 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {comment.createdAt.toDate().toLocaleDateString()}
              {comment.editedAt && (
                <span className="text-xs text-gray-500 ml-2">(edited)</span>
              )}
            </span>
          </div>
          {editingCommentId === comment.id ? (
            <div className="relative">
              <textarea
                value={editedCommentText}
                onChange={handleEditedCommentInputChangeWithMention}
                className={`w-full p-2 rounded mt-1 ${
                  isDarkMode
                    ? "bg-gray-700 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              />
              {editedCommentSuggestions.length > 0 && (
                <ul
                  className={`absolute z-10 w-full rounded-b-md max-h-40 overflow-y-auto mt-1 ${
                    isDarkMode
                      ? "bg-gray-700 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {editedCommentSuggestions.map((player) => (
                    <li
                      key={player.email}
                      onMouseDown={() =>
                        handleSelectEditedCommentSuggestion(player)
                      }
                      className={`p-2 cursor-pointer ${
                        isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-300"
                      }`}
                    >
                      {player.firstName} {player.lastName}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleUpdateComment(comment.id)}
                  className="py-1 px-3 bg-green-500 rounded text-white font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingCommentId(null)}
                  className="py-1 px-3 bg-red-500 rounded text-white font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p
              className={`${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              } my-1`}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(highlightMentions(comment.text)),
              }}
            ></p>
          )}

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
            {user?.uid === comment.userId &&
              editingCommentId !== comment.id && (
                <button
                  onClick={() => handleEditComment(comment)}
                  className={`font-semibold hover:text-blue-600 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Edit
                </button>
              )}
          </div>
          {renderComments(comment.id)}
        </div>
      ));
  };

  const headerColor = missionColors[item.ideationMission] || "bg-gray-600";

  return (
    <>
      <div
        data-tour-id={dataTourId}
        className={`rounded-sm shadow-xl relative break-words border-12  transition-all duration-300 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } ${isSelected ? "border-green-500" : "border-white"}`}
      >
        <div className={`${headerColor} py-5 px-6`}>
          <h4 className="font-extrabold text-[18px] text-black text-center uppercase">
            {`#${item.ideaNumber} ${item.ideaTitle}`}
          </h4>
          <h5 className="text-base font-semibold text-center text-black">
            {item.ideationMission}
          </h5>
        </div>
        <div className="relative">
          {" "}
          {/* Container for image and edit button */}
          <img
            src={item.imageUrl}
            alt={item.ideaTitle}
            className={`w-full ${
              readMoreVisible ? "h-auto object-contain" : "h-48 object-cover"
            }`}
          />
          {isCreator && (
            <>
              <button
                onClick={handleEditPictureClick}
                disabled={isUploading}
                className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                title="Update Image"
              >
                {isUploading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <FaPen className="h-4 w-4" />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpdate}
                accept="image/*, .gif" // Accept all image types and GIFs
                className="hidden"
              />
            </>
          )}
          {item.inspiredBy && item.inspiredBy.length > 0 && (
            <button
              onClick={() => setInspiredByVisible(true)}
              className="bg-gray-700/60 absolute top-2 left-2 hover:bg-yellow-600 text-white rounded-full w-12 h-12 flex items-center justify-center"
              title="Inspired by other ideas"
            >
              <FaLightbulb />
            </button>
          )}
        </div>

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
                {item.areas && item.areas.length > 0 && (
                  <div>
                    <b>Relevant Areas:</b>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.areas.map((area) => (
                        <span
                          key={area}
                          className={`${
                            isDarkMode
                              ? "bg-indigo-600 text-indigo-100"
                              : "bg-indigo-100 text-indigo-800"
                          } text-xs font-semibold px-2.5 py-0.5 rounded-full`}
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {item.whatIsNeeded && item.whatIsNeeded.length > 0 && (
                  <div>
                    <b>What is needed:</b>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.whatIsNeeded.map((needed) => (
                        <span
                          key={needed}
                          className={`${
                            isDarkMode
                              ? "bg-purple-600 text-purple-100"
                              : "bg-purple-100 text-purple-800"
                          } text-xs font-semibold px-2.5 py-0.5 rounded-full`}
                        >
                          {needed}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
          className={`p-2 border-y ${
            isDarkMode ? "border-gray-700" : "border-gray-300"
          } ${isDarkMode ? "text-gray-300" : "text-gray-800"}`}
        >
          <button
            onClick={() => setEvaluationVisible(true)} // Show the form to evaluate
            className={`w-full py-2 px-4 bg-gray-700 rounded-lg hover:bg-gray-800 text-white font-bold text-lg ${
              userEvaluation || isGameEnded ? "hidden" : ""
            }`}
            title="Evaluate Card"
            disabled={isGameEnded}
          >
            Evaluate Card
          </button>
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
              {isAdmin && (
                <button
                  onClick={toggleOutOfScope}
                  className={`rounded-full w-12 h-12 flex items-center justify-center transition-colors ${
                    item.outOfScope
                      ? "bg-red-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                  title={
                    item.outOfScope
                      ? "Mark as in scope"
                      : "Mark as out of scope"
                  }
                >
                  <FaTimes size={24} />
                </button>
              )}
              {isAdmin && item.outOfScope && (
                <button
                  onClick={toggleIsNew}
                  className={`rounded-full w-12 h-12 flex items-center justify-center transition-colors ${
                    item.isNew
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                  title={item.isNew ? "Mark as not new" : "Mark as new"}
                >
                  N
                </button>
              )}
              {userEvaluation && ( // Only show if already rated
                <button
                  onClick={() => setEvaluationVisible(!evaluationVisible)}
                  className={`rounded-full w-12 h-12 flex items-center justify-center transition-colors
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
                  <FaSearchDollar
                    size={24}
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
                } rounded-full w-12 h-12 flex items-center justify-center`}
                title="Comments"
              >
                <div className="flex items-center relative">
                  <FaComment size={24} />
                  {comments.length > 0 && (
                    <span className="text-xs text-amber-400 font-bold absolute left-1">
                      {comments.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => onSelect(item)}
                className={`rounded-full w-12 h-12 flex items-center justify-center transition-colors ${
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
                <PiLegoBold size={24} />
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
                        )} h-18 w-18 rounded-full flex items-center justify-center`}
                      >
                        <FaSearchDollar
                          size={28}
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
                          )} h-18 w-18 rounded-full flex items-center justify-center`}
                        >
                          <FaSearchDollar
                            size={28}
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
                  disabled={isSubmitting || isGameEnded}
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

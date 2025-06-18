import React, { useState, useContext, useEffect } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query, // Added query for fetching inviteList
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { AuthContext } from "../../context/AuthContext";
import type { AuthContextType } from "../../context/AuthContext";
import type { Idea } from "./IdeaTile"; // Import Idea type

// Define the structure of a player from inviteList
interface InvitedPlayer {
  email: string;
  firstName: string;
  lastName: string;
  team: string;
  location: string;
  organization: string;
}

interface IdeaModalProps {
  onClose: () => void;
  inspiredBy?: Idea[];
}

const missionOptions = [
  "E2E Touchless Supply Chain",
  "E2E Touchless Innovation",
  "Zero Waste",
];

const tagsByMission: { [key: string]: string[] } = {
  "E2E Touchless Supply Chain": ["BU 1", "BU 2", "BU 3"],
  "E2E Touchless Innovation": ["BU 3", "BU 4", "BU 5", "BU 6"],
  "Zero Waste": ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5"],
};

const IdeaModal: React.FC<IdeaModalProps> = ({ onClose, inspiredBy }) => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [ideaTitle, setIdeaTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [ideationMission, setIdeationMission] = useState(missionOptions[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [costEstimate, setCostEstimate] = useState("$0-$10K");
  const [ideaImage, setIdeaImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New states for mention feature
  const [allInvitedPlayers, setAllInvitedPlayers] = useState<InvitedPlayer[]>(
    []
  );
  const [titleSuggestions, setTitleSuggestions] = useState<InvitedPlayer[]>([]);
  const [descSuggestions, setDescSuggestions] = useState<InvitedPlayer[]>([]);
  const [reasoningSuggestions, setReasoningSuggestions] = useState<
    InvitedPlayer[]
  >([]);
  const [activeInput, setActiveInput] = useState<
    "title" | "description" | "reasoning" | null
  >(null);

  // Fetch invited players on component mount
  useEffect(() => {
    const fetchInvitedPlayers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "inviteList"));
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

  useEffect(() => {
    setSelectedTags([]);
  }, [ideationMission]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdeaImage(e.target.files[0]);
    }
  };

  const handleTagClick = (tag: string) => {
    setSelectedTags((prevTags) =>
      prevTags.includes(tag)
        ? prevTags.filter((t) => t !== tag)
        : [...prevTags, tag]
    );
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

  const handleInputChangeWithMention = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    setter: React.Dispatch<React.SetStateAction<string>>,
    setSuggestions: React.Dispatch<React.SetStateAction<InvitedPlayer[]>>,
    inputName: "title" | "description" | "reasoning"
  ) => {
    const text = e.target.value;
    setter(text);
    setActiveInput(inputName);

    const atIndex = text.lastIndexOf("@");
    if (atIndex > -1) {
      const searchTerm = text.substring(atIndex + 1).toLowerCase();
      const filtered = allInvitedPlayers.filter(
        (player) =>
          player.firstName.toLowerCase().includes(searchTerm) ||
          player.lastName.toLowerCase().includes(searchTerm) ||
          `${player.firstName} ${player.lastName}`
            .toLowerCase()
            .includes(searchTerm) // Also search for combined name
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (
    player: InvitedPlayer,
    currentText: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    setSuggestions: React.Dispatch<React.SetStateAction<InvitedPlayer[]>>
  ) => {
    const atIndex = currentText.lastIndexOf("@");
    if (atIndex > -1) {
      // Insert First Name Last Name into the form text
      const newText =
        currentText.substring(0, atIndex) +
        `@${player.firstName} ${player.lastName} `;
      setter(newText);
      setSuggestions([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to submit an idea.");
      return;
    }
    if (!ideaTitle || !shortDescription || !reasoning) {
      setError("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let imageUrl = "";
      if (ideaImage) {
        const storage = getStorage();
        const storageRef = ref(
          storage,
          `ideas/${user.uid}/${Date.now()}_${ideaImage.name}`
        );
        await uploadBytes(storageRef, ideaImage);
        imageUrl = await getDownloadURL(storageRef);
      }

      const ideasCollection = collection(db, "ideas");
      const ideasSnapshot = await getDocs(ideasCollection);
      const ideaNumber = ideasSnapshot.size + 1;

      const newIdea = {
        ideaNumber,
        ideaTitle,
        shortDescription,
        reasoning,
        costEstimate,
        imageUrl,
        ideationMission,
        tags: selectedTags,
        userId: user.uid,
        displayName: user.displayName || "Anonymous",
        createdAt: Timestamp.now(),
        approved: false,
        inspiredBy:
          inspiredBy?.map((idea) => ({
            id: idea.id,
            ideaTitle: idea.ideaTitle,
            imageUrl: idea.imageUrl,
            ideaNumber: idea.ideaNumber,
          })) || [],
      };

      const docRef = await addDoc(collection(db, "ideas"), newIdea);

      // Store player taggings for the new idea
      const taggedPlayers: {
        email: string;
        firstName: string;
        lastName: string;
      }[] = [];

      const ideaContent = [ideaTitle, shortDescription, reasoning].join(" ");
      const mentions = extractMentions(ideaContent);

      for (const player of mentions) {
        if (!taggedPlayers.some((p) => p.email === player.email)) {
          taggedPlayers.push(player);
          await addDoc(collection(db, "playerTaggings"), {
            ideaId: docRef.id,
            ideaTitle: ideaTitle,
            taggedPlayerDisplayName: `${player.firstName} ${player.lastName}`,
            taggedPlayerEmail: player.email,
            timestamp: Timestamp.now(),
            type: "idea", // Indicates this tagging is from an idea
          });
        }
      }

      onClose();
    } catch (err) {
      console.error("Error submitting idea:", err);
      setError("Failed to submit idea. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-800 text-white p-8 rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">
          {inspiredBy && inspiredBy.length > 0
            ? "Build Upon an Idea"
            : "Share Your Idea"}
        </h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          {inspiredBy && inspiredBy.length > 0 && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-white">
                Inspired By:
              </h3>
              <div className="flex flex-wrap gap-4">
                {inspiredBy.map((idea) => (
                  <div
                    key={idea.id}
                    className="flex flex-col items-center text-center"
                  >
                    <img
                      src={idea.imageUrl}
                      alt={idea.ideaTitle}
                      className="w-20 h-20 object-cover rounded-md"
                    />
                    <p className="text-xs mt-1 text-gray-300 w-24 truncate">
                      #{idea.ideaNumber}: {idea.ideaTitle}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="ideationMission"
              className="block mb-2 font-semibold"
            >
              Ideation Sub-Challenge
            </label>
            <select
              id="ideationMission"
              value={ideationMission}
              onChange={(e) => setIdeationMission(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded"
            >
              {missionOptions.map((mission) => (
                <option key={mission} value={mission}>
                  {mission}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="ideaTitle" className="block mb-2 font-semibold">
              Idea Title
            </label>
            <input
              id="ideaTitle"
              type="text"
              value={ideaTitle}
              onChange={(e) =>
                handleInputChangeWithMention(
                  e,
                  setIdeaTitle,
                  setTitleSuggestions,
                  "title"
                )
              }
              onFocus={() => setActiveInput("title")}
              onBlur={() => setTimeout(() => setActiveInput(null), 100)} // Delay hiding suggestions
              className="w-full p-2 bg-gray-700 rounded"
              required
            />
            {activeInput === "title" && titleSuggestions.length > 0 && (
              <ul className="absolute z-10 bg-gray-600 text-white w-full rounded-b-md max-h-40 overflow-y-auto mt-1">
                {titleSuggestions.map((player) => (
                  <li
                    key={player.email} // Still use email as key, it's unique
                    onMouseDown={() =>
                      handleSelectSuggestion(
                        player,
                        ideaTitle,
                        setIdeaTitle,
                        setTitleSuggestions
                      )
                    } // Use onMouseDown to prevent blur
                    className="p-2 cursor-pointer hover:bg-gray-500"
                  >
                    {player.firstName} {player.lastName}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mb-4">
            <label
              htmlFor="shortDescription"
              className="block mb-2 font-semibold"
            >
              Short Description
            </label>
            <textarea
              id="shortDescription"
              placeholder="Shortly descibe in laymen terms how your idea will help to achieve the challenge objective?"
              value={shortDescription}
              onChange={(e) =>
                handleInputChangeWithMention(
                  e,
                  setShortDescription,
                  setDescSuggestions,
                  "description"
                )
              }
              onFocus={() => setActiveInput("description")}
              onBlur={() => setTimeout(() => setActiveInput(null), 100)}
              className="w-full p-2 bg-gray-700 rounded"
              rows={3}
              required
            ></textarea>
            {activeInput === "description" && descSuggestions.length > 0 && (
              <ul className="absolute z-10 bg-gray-600 text-white w-full rounded-b-md max-h-40 overflow-y-auto mt-1">
                {descSuggestions.map((player) => (
                  <li
                    key={player.email}
                    onMouseDown={() =>
                      handleSelectSuggestion(
                        player,
                        shortDescription,
                        setShortDescription,
                        setDescSuggestions
                      )
                    }
                    className="p-2 cursor-pointer hover:bg-gray-500"
                  >
                    {player.firstName} {player.lastName}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mb-4">
            <label htmlFor="costEstimate" className="block mb-2 font-semibold">
              Cost Saving Estimate
            </label>
            <select
              id="costEstimate"
              value={costEstimate}
              onChange={(e) => setCostEstimate(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded"
            >
              <option value="Negative">Negative</option>
              <option value="$0-$10K">$0-$10K</option>
              <option value="$10K-$30K">$10K-$30K</option>
              <option value="$30K-$100K">$30K-$100K</option>
              <option value="$100K-$250K">$100K-$250K</option>
              <option value="$250K-$500K">$250K-$500K</option>
              <option value="$500K-$1M">$500K-$1M</option>
              <option value="$1M+">$1M+</option>
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="reasoning" className="block mb-2 font-semibold">
              Help Needed / Barriers to overcome
            </label>
            <textarea
              id="reasoning"
              placeholder="What kind of help/resources would be needed to make this happen? What are the main risks/hurdles to overcome to your idea a reality?"
              value={reasoning}
              onChange={(e) =>
                handleInputChangeWithMention(
                  e,
                  setReasoning,
                  setReasoningSuggestions,
                  "reasoning"
                )
              }
              onFocus={() => setActiveInput("reasoning")}
              onBlur={() => setTimeout(() => setActiveInput(null), 100)}
              className="w-full p-2 bg-gray-700 rounded"
              rows={3}
              required
            ></textarea>
            {activeInput === "reasoning" && reasoningSuggestions.length > 0 && (
              <ul className="absolute z-10 bg-gray-600 text-white w-full rounded-b-md max-h-40 overflow-y-auto mt-1">
                {reasoningSuggestions.map((player) => (
                  <li
                    key={player.email}
                    onMouseDown={() =>
                      handleSelectSuggestion(
                        player,
                        reasoning,
                        setReasoning,
                        setReasoningSuggestions
                      )
                    }
                    className="p-2 cursor-pointer hover:bg-gray-500"
                  >
                    {player.firstName} {player.lastName}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mb-4">
            <label className="block mb-2 font-semibold">Team Involvement</label>
            <div className="flex flex-wrap gap-2">
              {tagsByMission[ideationMission].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className={`py-1 px-3 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-red-500 text-white"
                      : "bg-gray-600 hover:bg-gray-500"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-6 mt-6">
            <label htmlFor="ideaImage" className="block mb-2 font-semibold">
              Upload Image (Optional)
            </label>
            <input
              id="ideaImage"
              type="file"
              onChange={handleImageChange}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-500 file:text-white hover:file:bg-red-700"
            />
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-gray-600 rounded-lg hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4 bg-red-500 rounded-lg hover:bg-red-700 font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Idea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IdeaModal;

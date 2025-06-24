// src/pages/privatePages/views/IdeaModal.tsx
import React, { useState, useContext, useEffect } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { AuthContext } from "../../context/AuthContext";
import type { AuthContextType } from "../../context/AuthContext";
import type { Idea } from "./IdeaTile"; // Import Idea type

// Define the structure of a player from inviteList - RE-INTRODUCED
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

const areaOptions = ["Area 1", "Area 2", "Area 3"];

// New options for the "What is needed" field
const neededOptions = ["Capital", "Digital", "Automation"];

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

const IdeaModal: React.FC<IdeaModalProps> = ({ onClose, inspiredBy }) => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [ideaTitle, setIdeaTitle] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [whatIsNeeded, setWhatIsNeeded] = useState<string[]>([]); // State for the new field
  const [shortDescription, setShortDescription] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [ideationMission, setIdeationMission] = useState(missionOptions[0]);
  const [costEstimate, setCostEstimate] = useState("$0-$10K");
  const [feasibilityEstimate, setFeasibilityEstimate] =
    useState("Very easy to do");
  const [ideaImage, setIdeaImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for "People to involve" with @ feature
  const [peopleToInvolveInput, setPeopleToInvolveInput] = useState("");
  const [involvedPeople, setInvolvedPeople] = useState<string[]>([]); // Store display names
  const [peopleSuggestions, setPeopleSuggestions] = useState<InvitedPlayer[]>(
    []
  );
  const [allInvitedPlayers, setAllInvitedPlayers] = useState<InvitedPlayer[]>(
    []
  );

  const MAX_TITLE_LENGTH = 30;
  const MIN_TITLE_LENGTH = 3;

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
    setInvolvedPeople([]);
  }, [ideationMission]);

  const handleAreaToggle = (areaToToggle: string) => {
    setAreas((prevAreas) =>
      prevAreas.includes(areaToToggle)
        ? prevAreas.filter((area) => area !== areaToToggle)
        : [...prevAreas, areaToToggle]
    );
  };

  // Handler for the new "What is needed" field
  const handleNeededToggle = (neededToToggle: string) => {
    setWhatIsNeeded((prevNeeded) =>
      prevNeeded.includes(neededToToggle)
        ? prevNeeded.filter((item) => item !== neededToToggle)
        : [...prevNeeded, neededToToggle]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdeaImage(e.target.files[0]);
    }
  };

  const handleRemoveInvolvedPerson = (personToRemove: string) => {
    setInvolvedPeople(
      involvedPeople.filter((person) => person !== personToRemove)
    );
  };

  const handlePeopleToInvolveInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const text = e.target.value;
    setPeopleToInvolveInput(text);

    const atIndex = text.lastIndexOf("@");
    if (atIndex > -1) {
      const searchTerm = text.substring(atIndex + 1).toLowerCase();
      const filtered = allInvitedPlayers.filter(
        (player) =>
          player.firstName.toLowerCase().includes(searchTerm) ||
          player.lastName.toLowerCase().includes(searchTerm) ||
          `${player.firstName} ${player.lastName}`
            .toLowerCase()
            .includes(searchTerm)
      );
      setPeopleSuggestions(filtered);
    } else {
      setPeopleSuggestions([]);
    }
  };

  const handleSelectPeopleSuggestion = (player: InvitedPlayer) => {
    const atIndex = peopleToInvolveInput.lastIndexOf("@");
    if (atIndex > -1) {
      const personDisplayName = `${player.firstName} ${player.lastName}`;
      if (!involvedPeople.includes(personDisplayName)) {
        setInvolvedPeople((prevPeople) => [...prevPeople, personDisplayName]);
      }
      setPeopleToInvolveInput("");
      setPeopleSuggestions([]);
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
    if (
      ideaTitle.length < MIN_TITLE_LENGTH ||
      ideaTitle.length > MAX_TITLE_LENGTH
    ) {
      setError(
        `Idea Title must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters.`
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let imageUrl =
        "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/istockphoto-1409329028-612x612.jpg?alt=media&token=f9532044-a778-44d1-92d8-16b42c411388";
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
        areas,
        whatIsNeeded, // Add the new field's data
        shortDescription,
        reasoning,
        costEstimate,
        feasibilityEstimate,
        imageUrl,
        ideationMission,
        tags: involvedPeople,
        userId: user.uid,
        displayName: user.displayName || "Anonymous",
        email: user.email || "N/A",
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

      const uniqueTaggedPlayers: {
        email: string;
        firstName: string;
        lastName: string;
      }[] = [];
      involvedPeople.forEach((displayName) => {
        const foundPlayer = allInvitedPlayers.find(
          (player) => `${player.firstName} ${player.lastName}` === displayName
        );
        if (
          foundPlayer &&
          !uniqueTaggedPlayers.some((p) => p.email === foundPlayer.email)
        ) {
          uniqueTaggedPlayers.push(foundPlayer);
        }
      });

      for (const player of uniqueTaggedPlayers) {
        await addDoc(collection(db, "playerTaggings"), {
          ideaId: docRef.id,
          ideaTitle: ideaTitle,
          taggedPlayerDisplayName: `${player.firstName} ${player.lastName}`,
          taggedPlayerEmail: player.email,
          timestamp: Timestamp.now(),
          type: "idea",
        });
      }

      const evaluationDocRef = doc(
        db,
        "evaluations",
        `${user.uid}_${docRef.id}`
      );
      await setDoc(evaluationDocRef, {
        ideaId: docRef.id,
        EvaluationDate: Timestamp.now(),
        IdeaOwnerDisplayName: user.displayName || "Anonymous",
        IdeaOwnerEmail: user.email || "N/A",
        IdeaOwnerUserId: user.uid,
        EvaluatorDisplayName: user.displayName || "Anonymous",
        EvaluatorEmail: user.email || "N/A",
        EvaluatorUserId: user.uid,
        ImpactScore: costEstimate,
        FeasibilityScore: feasibilityEstimate,
      });

      onClose();
    } catch (err) {
      console.error("Error submitting idea:", err);
      setError("Failed to submit idea. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-5000">
      <div className="bg-gray-800 text-white p-8 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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

          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 gap-y-4">
            {/* --- LEFT COLUMN --- */}
            <div className="flex flex-col gap-4">
              <div>
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

              <div>
                <label htmlFor="ideaTitle" className="block mb-2 font-semibold">
                  Idea Title
                </label>
                <input
                  id="ideaTitle"
                  type="text"
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded"
                  minLength={MIN_TITLE_LENGTH}
                  maxLength={MAX_TITLE_LENGTH}
                  required
                />
                <p className="text-sm text-gray-400 mt-1">
                  {ideaTitle.length}/{MAX_TITLE_LENGTH} characters (min:{" "}
                  {MIN_TITLE_LENGTH})
                </p>
              </div>

              <div>
                <label
                  htmlFor="shortDescription"
                  className="block mb-2 font-semibold"
                >
                  Short Idea Description
                </label>
                <textarea
                  id="shortDescription"
                  placeholder="Shortly descibe in simple terms how your idea will help to achieve the challenge objective?"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded"
                  rows={3}
                  required
                ></textarea>
              </div>

              <div>
                <label className="block mb-2 font-semibold">
                  Areas where cost savings would apply?
                </label>
                <div className="flex flex-wrap gap-2">
                  {areaOptions.map((area) => (
                    <button
                      type="button"
                      key={area}
                      onClick={() => handleAreaToggle(area)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                        areas.includes(area)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-2 font-semibold">
                  What is needed?
                </label>
                <div className="flex flex-wrap gap-2">
                  {neededOptions.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => handleNeededToggle(item)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                        whatIsNeeded.includes(item)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* --- RIGHT COLUMN --- */}
            <div className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="costEstimate"
                  className="block mb-2 font-semibold"
                >
                  Cost Saving Estimate (YoY)
                </label>
                <select
                  id="costEstimate"
                  value={costEstimate}
                  onChange={(e) => setCostEstimate(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded"
                >
                  {costImpactOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="feasibilityEstimate"
                  className="block mb-2 font-semibold"
                >
                  Feasibility Assessment
                </label>
                <select
                  id="feasibilityEstimate"
                  value={feasibilityEstimate}
                  onChange={(e) => setFeasibilityEstimate(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded"
                >
                  {feasibilityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="reasoning" className="block mb-2 font-semibold">
                  Help Needed / Barriers to overcome
                </label>
                <textarea
                  id="reasoning"
                  placeholder="What kind of help/resources would be needed to make this happen? What are the main risks/hurdles to overcome to your idea a reality?"
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded"
                  rows={3}
                  required
                ></textarea>
              </div>

              <div className="relative">
                <label
                  htmlFor="peopleToInvolve"
                  className="block mb-2 font-semibold"
                >
                  People to involve
                </label>
                <input
                  id="peopleToInvolve"
                  type="text"
                  value={peopleToInvolveInput}
                  onChange={handlePeopleToInvolveInputChange}
                  className="w-full p-2 bg-gray-700 rounded"
                  placeholder="press @ to add people to this idea"
                />
                {peopleSuggestions.length > 0 && (
                  <ul className="absolute z-10 bg-gray-600 text-white w-full rounded-b-md max-h-40 overflow-y-auto mt-1">
                    {peopleSuggestions.map((player) => (
                      <li
                        key={player.email}
                        onMouseDown={() => handleSelectPeopleSuggestion(player)}
                        className="p-2 cursor-pointer hover:bg-gray-500"
                      >
                        {player.firstName} {player.lastName}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {involvedPeople.map((person) => (
                    <span
                      key={person}
                      className="bg-blue-600 text-white text-sm font-semibold px-3 py-1 rounded-full flex items-center"
                    >
                      @{person}
                      <button
                        type="button"
                        onClick={() => handleRemoveInvolvedPerson(person)}
                        className="ml-2 text-white hover:text-gray-200"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="ideaImage" className="block mb-2 font-semibold">
                  Idea Image (Optional)
                </label>
                <input
                  id="ideaImage"
                  type="file"
                  onChange={handleImageChange}
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-500 file:text-white hover:file:bg-red-700"
                  accept="image/*,.gif"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
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

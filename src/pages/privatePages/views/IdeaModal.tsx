import React, { useState, useContext, useEffect } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, Timestamp, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { AuthContext } from "../../context/AuthContext";
import type { AuthContextType } from "../../context/AuthContext";
import type { Idea } from "./IdeaTile"; // Import Idea type

interface IdeaModalProps {
  onClose: () => void;
  inspiredBy?: Idea[];
}

const missionOptions = [
  "Touchless Processes",
  "Touchless Innovation",
  "Waste Reduction",
];

const tagsByMission: { [key: string]: string[] } = {
  "Touchless Processes": ["DD1", "DD2", "DD3"],
  "Touchless Innovation": ["PP1", "PP2", "PP3"],
  "Waste Reduction": ["RR1", "RR2", "RR3", "RR4", "RR5"],
};

const IdeaModal: React.FC<IdeaModalProps> = ({ onClose, inspiredBy }) => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [ideaTitle, setIdeaTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [ideationMission, setIdeationMission] = useState(missionOptions[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [costEstimate, setCostEstimate] = useState("$1,000 - $10,000");
  const [ideaImage, setIdeaImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      await addDoc(collection(db, "ideas"), newIdea);

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
              Ideation Mission
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
          <div className="mb-4">
            <label htmlFor="ideaTitle" className="block mb-2 font-semibold">
              Idea Title
            </label>
            <input
              id="ideaTitle"
              type="text"
              value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded"
              required
            />
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
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded"
              rows={3}
              required
            ></textarea>
          </div>
          <div className="mb-4">
            <label htmlFor="reasoning" className="block mb-2 font-semibold">
              Feasibility Reasoning
            </label>
            <textarea
              id="reasoning"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded"
              rows={3}
              required
            ></textarea>
          </div>
          <div className="mb-4">
            <label htmlFor="costEstimate" className="block mb-2 font-semibold">
              Cost Estimate (TRL)
            </label>
            <select
              id="costEstimate"
              value={costEstimate}
              onChange={(e) => setCostEstimate(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded"
            >
              <option value="$1,000 - $10,000">$1,000 - $10,000</option>
              <option value="$10,000 - $50,000">$10,000 - $50,000</option>
              <option value="$50,000+">$50,000+</option>
            </select>
          </div>
          <div className="mb-6">
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

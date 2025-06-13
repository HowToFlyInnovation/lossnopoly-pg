import React, { useState, useContext } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { AuthContext } from "../../context/AuthContext";
import type { AuthContextType } from "../../context/AuthContext";

interface IdeaModalProps {
  onClose: () => void;
}

const IdeaModal: React.FC<IdeaModalProps> = ({ onClose }) => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [ideaTitle, setIdeaTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [costEstimate, setCostEstimate] = useState("$1,000 - $10,000");
  const [ideaImage, setIdeaImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdeaImage(e.target.files[0]);
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

      const newIdea = {
        ideaTitle,
        shortDescription,
        reasoning,
        costEstimate,
        imageUrl,
        userId: user.uid,
        displayName: user.displayName || "Anonymous", // Include displayName
        createdAt: Timestamp.now(),
        approved: false,
      };

      await addDoc(collection(db, "ideas"), newIdea);

      onClose(); // Close modal on successful submission
    } catch (err) {
      console.error("Error submitting idea:", err);
      setError("Failed to submit idea. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-800 text-white p-8 rounded-lg shadow-2xl max-w-lg w-full">
        <h2 className="text-2xl font-bold mb-6">Share Your Idea</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
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

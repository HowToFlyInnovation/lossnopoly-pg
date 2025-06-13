import React, { useState, useContext } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase/config"; // Make sure to export 'storage' from your firebase config
import { AuthContext } from "../../context/AuthContext";
import type { AuthContextType } from "../../context/AuthContext";
import { FaTimes, FaCloudUploadAlt } from "react-icons/fa";

interface IdeaModalProps {
  onClose: () => void;
}

const IdeaModal: React.FC<IdeaModalProps> = ({ onClose }) => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [ideaTitle, setIdeaTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [costEstimate, setCostEstimate] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [ideaImage, setIdeaImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIdeaImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    setIsSubmitting(true);

    let imageUrl = "";
    if (ideaImage) {
      const imageRef = ref(
        storage,
        `ideas/${user.uid}/${Date.now()}_${ideaImage.name}`
      );
      await uploadBytes(imageRef, ideaImage);
      imageUrl = await getDownloadURL(imageRef);
    }

    try {
      await addDoc(collection(db, "ideas"), {
        ideaTitle,
        shortDescription,
        costEstimate,
        reasoning,
        imageUrl,
        userId: user.uid,
        createdAt: Timestamp.now(),
      });
      onClose();
    } catch (error) {
      console.error("Error adding document: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-gray-800 text-white rounded-lg shadow-2xl p-8 w-full max-w-2xl transform transition-all">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Share Your Idea</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <FaTimes size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="ideaTitle"
              className="block text-sm font-semibold mb-2"
            >
              Idea Title
            </label>
            <input
              id="ideaTitle"
              type="text"
              value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="shortDescription"
              className="block text-sm font-semibold mb-2"
            >
              Short Description
            </label>
            <textarea
              id="shortDescription"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            ></textarea>
          </div>
          <div className="mb-4">
            <label
              htmlFor="costEstimate"
              className="block text-sm font-semibold mb-2"
            >
              Cost Estimate
            </label>
            <select
              id="costEstimate"
              value={costEstimate}
              onChange={(e) => setCostEstimate(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            >
              <option value="" disabled>
                Select an estimate
              </option>
              <option value="< $1,000">&lt; $1,000</option>
              <option value="$1,000 - $5,000">$1,000 - $5,000</option>
              <option value="$5,000 - $20,000">$5,000 - $20,000</option>
              <option value="> $20,000">&gt; $20,000</option>
            </select>
          </div>
          <div className="mb-4">
            <label
              htmlFor="reasoning"
              className="block text-sm font-semibold mb-2"
            >
              Feasibility Reasoning
            </label>
            <textarea
              id="reasoning"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            ></textarea>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">
              Idea Image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mx-auto h-40 rounded-lg"
                  />
                ) : (
                  <>
                    <FaCloudUploadAlt className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-400">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-gray-700 rounded-md font-medium text-red-400 hover:text-red-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-red-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleImageChange}
                          accept="image/*"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-500"
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

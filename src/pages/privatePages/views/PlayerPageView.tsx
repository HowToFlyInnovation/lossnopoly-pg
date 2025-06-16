import { useContext, useState, useEffect, useRef } from "react";
import { AuthContext, type AuthContextType } from "../../context/AuthContext";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// --- TYPE DEFINITIONS ---
interface PlayerStats {
  ideasCreated: number;
  commentsMade: number;
  ideasInspired: number;
  evaluationsMade: number;
  xpCollected: number;
}

interface DailyStat {
  date: string;
  ideasCreated: number;
  commentsMade: number;
  ideasInspired: number;
  evaluationsMade: number;
  xpCollected: number;
}

const PlayerPageView = () => {
  const authContext = useContext<AuthContextType | null>(AuthContext);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!authContext) {
    return <div>Loading...</div>;
  }

  const { user: currentUser } = authContext;

  useEffect(() => {
    const fetchAndProcessData = async () => {
      setLoading(true);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const [ideasSnapshot, commentsSnapshot, evaluationsSnapshot] =
        await Promise.all([
          getDocs(collection(db, "ideas")),
          getDocs(collection(db, "comments")),
          getDocs(collection(db, "evaluations")),
        ]);

      const ideas = ideasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];
      const comments = commentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];
      const evaluations = evaluationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];

      const dailyStatsMap = new Map<string, DailyStat>();

      const getDailyStat = (date: string) => {
        if (!dailyStatsMap.has(date)) {
          dailyStatsMap.set(date, {
            date,
            ideasCreated: 0,
            commentsMade: 0,
            ideasInspired: 0,
            evaluationsMade: 0,
            xpCollected: 0,
          });
        }
        return dailyStatsMap.get(date)!;
      };

      const ideasToProcess = showAllPlayers
        ? ideas
        : ideas.filter((idea) => idea.userId === currentUser.uid);
      ideasToProcess.forEach((doc) => {
        if (doc.createdAt && typeof doc.createdAt.toDate === "function") {
          const date = (doc.createdAt as Timestamp)
            .toDate()
            .toISOString()
            .split("T")[0];
          const stats = getDailyStat(date);
          stats.ideasCreated += 1;
          stats.xpCollected += 10;
        }
      });

      const commentsToProcess = showAllPlayers
        ? comments
        : comments.filter((comment) => comment.userId === currentUser.uid);
      commentsToProcess.forEach((doc) => {
        if (doc.createdAt && typeof doc.createdAt.toDate === "function") {
          const date = (doc.createdAt as Timestamp)
            .toDate()
            .toISOString()
            .split("T")[0];
          const stats = getDailyStat(date);
          stats.commentsMade += 1;
          stats.xpCollected += 2;
        }
      });

      const evaluationsToProcess = showAllPlayers
        ? evaluations
        : evaluations.filter(
            (evaluation) => evaluation.EvaluatorUserId === currentUser.uid
          );
      evaluationsToProcess.forEach((doc) => {
        if (doc.createdAt && typeof doc.createdAt.toDate === "function") {
          const date = (doc.createdAt as Timestamp)
            .toDate()
            .toISOString()
            .split("T")[0];
          const stats = getDailyStat(date);
          stats.evaluationsMade += 1;
          stats.xpCollected += 2;
        }
      });

      const ideaAuthorMap = new Map(ideas.map((i) => [i.id, i.userId]));
      ideas.forEach((idea) => {
        if (idea.inspiredBy) {
          idea.inspiredBy.forEach((inspiration: { id: string }) => {
            const inspiringIdeaAuthorId = ideaAuthorMap.get(inspiration.id);
            if (
              inspiringIdeaAuthorId &&
              inspiringIdeaAuthorId !== idea.userId
            ) {
              const shouldCount =
                showAllPlayers || inspiringIdeaAuthorId === currentUser.uid;
              if (
                shouldCount &&
                idea.createdAt &&
                typeof idea.createdAt.toDate === "function"
              ) {
                const date = (idea.createdAt as Timestamp)
                  .toDate()
                  .toISOString()
                  .split("T")[0];
                const stats = getDailyStat(date);
                stats.ideasInspired += 1;
                stats.xpCollected += 5;
              }
            }
          });
        }
      });

      const today = new Date("2025-06-16T12:00:00Z");
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const dateRange = [];
      for (
        let d = new Date(yesterday);
        d <= today;
        d.setDate(d.getDate() + 1)
      ) {
        dateRange.push(d.toISOString().split("T")[0]);
      }

      const finalDailyStats = dateRange.map((date) => {
        return (
          dailyStatsMap.get(date) || {
            date,
            ideasCreated: 0,
            commentsMade: 0,
            ideasInspired: 0,
            evaluationsMade: 0,
            xpCollected: 0,
          }
        );
      });

      setDailyStats(finalDailyStats);

      const totalStats: PlayerStats = {
        ideasCreated: finalDailyStats.reduce(
          (sum, day) => sum + day.ideasCreated,
          0
        ),
        commentsMade: finalDailyStats.reduce(
          (sum, day) => sum + day.commentsMade,
          0
        ),
        ideasInspired: finalDailyStats.reduce(
          (sum, day) => sum + day.ideasInspired,
          0
        ),
        evaluationsMade: finalDailyStats.reduce(
          (sum, day) => sum + day.evaluationsMade,
          0
        ),
        xpCollected: finalDailyStats.reduce(
          (sum, day) => sum + day.xpCollected,
          0
        ),
      };
      setPlayerStats(totalStats);

      setLoading(false);
    };

    if (authContext.authIsReady) {
      fetchAndProcessData();
    }
  }, [currentUser, showAllPlayers, authContext.authIsReady]);

  const handleEditPicture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentUser) {
      const file = e.target.files[0];

      if (!file.type.startsWith("image/")) {
        console.error("Invalid file type. Please select an image.");
        return;
      }

      setUploading(true);

      const storage = getStorage();
      const storageRef = ref(storage, `profilePictures/${currentUser.uid}`);

      try {
        await uploadBytes(storageRef, file);
        const photoURL = await getDownloadURL(storageRef);

        await updateProfile(currentUser, { photoURL });

        const playerDocRef = doc(db, "players", currentUser.uid);
        await updateDoc(playerDocRef, { profilePic: photoURL });

        console.log("Profile picture updated successfully!");
      } catch (error) {
        console.error("Error uploading profile picture:", error);
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const renderChart = (
    dataKey: keyof DailyStat,
    color: string,
    name: string
  ) => (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={dailyStats}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey={dataKey} fill={color} name={name} />
      </BarChart>
    </ResponsiveContainer>
  );

  if (loading) {
    return (
      <div className="w-full py-[11vh] px-8 md:px-20 text-black bg-gray-100 min-h-screen">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 uppercase mb-8 text-left">
          Player Dashboard
        </h1>
        <p className="text-center">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="w-full py-[11vh] px-8 md:px-20 text-black bg-gray-100 min-h-screen">
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 uppercase mb-8 text-left">
        Player Dashboard
      </h1>
      <div>
        <div className="bg-white rounded-lg shadow-md mb-8 pr-12">
          <div className="flex items-center">
            <div className="relative">
              <img
                className="h-40 w-auto"
                src={currentUser?.photoURL || "https://via.placeholder.com/150"}
                alt="Player profile"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
                accept="image/*"
              />
              <button
                onClick={handleEditPicture}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 disabled:bg-gray-400"
              >
                {uploading ? (
                  <svg
                    className="animate-spin h-6 w-6 text-white"
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 5.232z"
                    />
                  </svg>
                )}
              </button>
            </div>
            <div className="w-full px-24">
              <h2 className="text-2xl font-bold text-gray-800">
                {currentUser?.displayName}
              </h2>
              <div className="mt-4 flex row w-[100%] justify-between">
                <div>
                  <span className="text-sm text-gray-500">Ideas Created</span>
                  <p className="text-xl font-semibold text-gray-800">
                    {playerStats?.ideasCreated || 0}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Comments Made</span>
                  <p className="text-xl font-semibold text-gray-800">
                    {playerStats?.commentsMade || 0}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Ideas Inspired</span>
                  <p className="text-xl font-semibold text-gray-800">
                    {playerStats?.ideasInspired || 0}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">
                    Evaluations Made
                  </span>
                  <p className="text-xl font-semibold text-gray-800">
                    {playerStats?.evaluationsMade || 0}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">XP Collected</span>
                  <p className="text-xl font-semibold text-gray-800">
                    {playerStats?.xpCollected || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Daily Activity</h3>
            <div className="bg-gray-200 rounded-full p-1 flex">
              <button
                onClick={() => setShowAllPlayers(false)}
                className={`px-4 py-1 text-sm font-semibold rounded-full ${
                  !showAllPlayers ? "bg-white shadow" : "text-gray-600"
                }`}
              >
                Only Me
              </button>
              <button
                onClick={() => setShowAllPlayers(true)}
                className={`px-4 py-1 text-sm font-semibold rounded-full ${
                  showAllPlayers ? "bg-white shadow" : "text-gray-600"
                }`}
              >
                All Players
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <h4 className="text-lg font-semibold mb-2 text-center">
                Ideas Created
              </h4>
              {renderChart("ideasCreated", "#8884d8", "Ideas Created")}
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-2 text-center">
                Comments Made
              </h4>
              {renderChart("commentsMade", "#82ca9d", "Comments Made")}
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-2 text-center">
                Ideas Inspired
              </h4>
              {renderChart("ideasInspired", "#ffc658", "Ideas Inspired")}
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-2 text-center">
                Evaluations Made
              </h4>
              {renderChart("evaluationsMade", "#ff7300", "Evaluations Made")}
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-2 text-center">
                XP Collected
              </h4>
              {renderChart("xpCollected", "#00C49F", "XP Collected")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerPageView;

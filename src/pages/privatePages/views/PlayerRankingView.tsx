import React, { useState, useEffect, useMemo, useContext } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { AuthContext } from "../../context/AuthContext";
import { FaInfoCircle } from "react-icons/fa"; // Import the info icon

// --- TYPE DEFINITIONS ---

interface Player {
  userId: string;
  displayName: string;
  profilePic?: string;
}

interface Idea {
  id: string;
  userId: string;
  createdAt: Timestamp;
  inspiredBy?: { id: string }[];
}

interface Comment {
  userId: string;
  createdAt: Timestamp;
}

interface Evaluation {
  EvaluatorUserId: string;
  createdAt: Timestamp;
}

interface PlayerStats {
  userId: string;
  displayName: string;
  profilePic?: string;
  ideasCreated: number;
  commentsPlaced: number;
  ideasInspired: number;
  evaluationsMade: number;
  longestStreak: number;
  xp: number;
}

type SortableKeys = keyof Omit<PlayerStats, "userId" | "profilePic">;
type SortDirection = "ascending" | "descending";

interface SortConfig {
  key: SortableKeys;
  direction: SortDirection;
}

// --- [NEW] INFO MODAL COMPONENT ---
const InfoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 text-white p-8 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">How the Player Ranking Works</h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold text-white hover:text-gray-400"
          >
            &times;
          </button>
        </div>

        <div className="space-y-6 text-gray-300">
          <div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              1. The Leaderboard
            </h3>
            <p>
              This table ranks all participants based on their contributions to
              the ideation platform. You can sort the table by clicking on any
              of the column headers. Your own row is highlighted for easy
              visibility.
            </p>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <p className="font-bold">
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/PlayerRankingVisual1.png?alt=media&token=b56ce684-1814-4c14-9f4b-4a2869f92133"
                  className="w-full"
                />
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              2. XP Scoring System
            </h3>
            <p>
              Experience Points (XP) are awarded for various activities that
              drive innovation forward. Here’s how you can earn them:
            </p>
            <ul className="list-disc list-inside ml-4 my-2 space-y-2 bg-gray-900 p-4 rounded-lg">
              <li>
                <strong>Create Your 1st Idea:</strong>{" "}
                <span className="font-bold text-green-400">+20 XP</span>
              </li>
              <li>
                <strong>Create Your 2nd Idea:</strong>{" "}
                <span className="font-bold text-green-400">+15 XP</span>
              </li>
              <li>
                <strong>Create Your 3rd Idea:</strong>{" "}
                <span className="font-bold text-green-400">+10 XP</span>
              </li>
              <li>
                <strong>Create Any Subsequent Idea:</strong>{" "}
                <span className="font-bold text-green-400">+5 XP</span>
              </li>
              <li>
                <strong>Inspire a New Idea:</strong>{" "}
                <span className="font-bold text-green-400">+10 XP</span> (when
                someone builds upon your idea)
              </li>
              <li>
                <strong>Place a Comment:</strong>{" "}
                <span className="font-bold text-green-400">+2 XP</span> (per
                comment)
              </li>
              <li>
                <strong>Make an Evaluation:</strong>{" "}
                <span className="font-bold text-green-400">+2 XP</span> (per
                evaluation)
              </li>
              <li>
                <strong>Daily Activity Streak:</strong>{" "}
                <span className="font-bold text-green-400">+5 XP</span> (per day
                in the streak)
              </li>
              <li>
                <strong>Idea you created gets shortlisted</strong>{" "}
                <span className="font-bold text-green-400">+20 XP</span>
              </li>
              <li>
                <strong>Idea you inspired gets shortlisted</strong>{" "}
                <span className="font-bold text-green-400">+20 XP</span>
              </li>
              <li>
                <strong>Idea you scored high gets shorltisted</strong>{" "}
                <span className="font-bold text-green-400">+10 XP</span>
              </li>
              <li>
                <strong>Idea you scored high gets NOT shorltisted</strong>{" "}
                <span className="font-bold text-red-400">-3 XP</span>
              </li>
              <li>
                <strong>Idea you scored low gets shorltisted</strong>{" "}
                <span className="font-bold text-red-400">-5 XP</span>
              </li>
              <li>
                <strong>Idea you scored low gets shorltisted</strong>{" "}
                <span className="font-bold text-green-400">+5 XP</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- HELPER COMPONENT FOR SORT INDICATORS ---

const SortIndicator: React.FC<{
  sortConfig: SortConfig;
  columnKey: SortableKeys;
}> = ({ sortConfig, columnKey }) => {
  const isSorted = sortConfig.key === columnKey;
  const isAscending = isSorted && sortConfig.direction === "ascending";
  const isDescending = isSorted && sortConfig.direction === "descending";

  return (
    <span className="inline-flex flex-col ml-2">
      <svg
        className={`h-3 w-3 -mb-1 ${
          isAscending ? "text-white" : "text-gray-500"
        }`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M10 3l-7 8h14l-7-8z" />
      </svg>
      <svg
        className={`h-3 w-3 ${isDescending ? "text-white" : "text-gray-500"}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M10 17l7-8H3l7 8z" />
      </svg>
    </span>
  );
};

// --- RANKING PAGE COMPONENT ---

const PlayerRankingView: React.FC = () => {
  const authContext = useContext(AuthContext); // Get the entire context value
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false); // State for modal
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "xp",
    direction: "descending",
  });

  useEffect(() => {
    // Wait until authentication is ready before fetching data
    if (!authContext?.authIsReady) {
      return;
    }

    const calculateAllStats = async () => {
      setLoading(true);
      try {
        const [
          playersSnapshot,
          ideasSnapshot,
          commentsSnapshot,
          evaluationsSnapshot,
        ] = await Promise.all([
          getDocs(collection(db, "players")),
          getDocs(collection(db, "ideas")),
          getDocs(collection(db, "comments")),
          getDocs(collection(db, "evaluations")),
        ]);

        const players = playersSnapshot.docs.map(
          (doc) => ({ userId: doc.id, ...doc.data() } as Player)
        );
        const ideas = ideasSnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt,
            } as Idea)
        );
        const comments = commentsSnapshot.docs.map(
          (doc) =>
            ({ ...doc.data(), createdAt: doc.data().createdAt } as Comment)
        );
        const evaluations = evaluationsSnapshot.docs.map(
          (doc) =>
            ({ ...doc.data(), createdAt: doc.data().createdAt } as Evaluation)
        );

        const ideaAuthorMap = new Map(ideas.map((i) => [i.id, i.userId]));
        const inspirationCounts: { [userId: string]: number } = {};

        ideas.forEach((idea) => {
          if (idea.inspiredBy) {
            idea.inspiredBy.forEach((inspiration) => {
              const inspiringIdeaAuthorId = ideaAuthorMap.get(inspiration.id);
              if (
                inspiringIdeaAuthorId &&
                inspiringIdeaAuthorId !== idea.userId
              ) {
                inspirationCounts[inspiringIdeaAuthorId] =
                  (inspirationCounts[inspiringIdeaAuthorId] || 0) + 1;
              }
            });
          }
        });

        const finalStats = players.map((player) => {
          const playerIdeas = ideas
            .filter((i) => i.userId === player.userId)
            .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
          const playerComments = comments.filter(
            (c) => c.userId === player.userId
          );
          const playerEvaluations = evaluations.filter(
            (e) => e.EvaluatorUserId === player.userId
          );

          const allActions = [
            ...playerIdeas,
            ...playerComments,
            ...playerEvaluations,
          ].filter((action) => action.createdAt);

          const uniqueDays = new Set(
            allActions.map((action) =>
              Math.floor(
                action.createdAt.toDate().getTime() / (1000 * 60 * 60 * 24)
              )
            )
          );
          const sortedDays = Array.from(uniqueDays).sort((a, b) => a - b);

          let longestStreak = 0;
          if (sortedDays.length > 0) {
            longestStreak = 1;
            let currentStreak = 1;
            for (let i = 1; i < sortedDays.length; i++) {
              if (sortedDays[i] === sortedDays[i - 1] + 1) {
                currentStreak++;
              } else {
                currentStreak = 1;
              }
              if (currentStreak > longestStreak) {
                longestStreak = currentStreak;
              }
            }
          }

          let xp = 0;
          playerIdeas.forEach((_, index) => {
            if (index === 0) xp += 20;
            else if (index === 1) xp += 15;
            else if (index === 2) xp += 10;
            else xp += 5;
          });
          xp += playerComments.length * 2;
          xp += playerEvaluations.length * 2;
          const ideasInspired = inspirationCounts[player.userId] || 0;
          xp += ideasInspired * 10;
          xp += longestStreak * 5;

          return {
            userId: player.userId,
            displayName: player.displayName,
            profilePic: player.profilePic,
            ideasCreated: playerIdeas.length,
            commentsPlaced: playerComments.length,
            evaluationsMade: playerEvaluations.length,
            ideasInspired,
            longestStreak,
            xp,
          };
        });

        setPlayerStats(finalStats);
      } catch (error) {
        console.error("Error calculating stats:", error);
      } finally {
        setLoading(false);
      }
    };

    calculateAllStats();
  }, [authContext]); // Depend on the whole context

  const sortedPlayerStats = useMemo(() => {
    let sortableItems = [...playerStats];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortConfig.direction === "ascending"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "ascending"
            ? aValue - bValue
            : bValue - aValue;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [playerStats, sortConfig]);

  const totals = useMemo(() => {
    return {
      ideasCreated: playerStats.reduce((acc, p) => acc + p.ideasCreated, 0),
      commentsPlaced: playerStats.reduce((acc, p) => acc + p.commentsPlaced, 0),
      ideasInspired: playerStats.reduce((acc, p) => acc + p.ideasInspired, 0),
      evaluationsMade: playerStats.reduce(
        (acc, p) => acc + p.evaluationsMade,
        0
      ),
      xp: playerStats.reduce((acc, p) => acc + p.xp, 0),
    };
  }, [playerStats]);

  const requestSort = (key: SortableKeys) => {
    let direction: SortDirection = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const TableHeader: React.FC<{
    columnKey: SortableKeys;
    title: string;
    className?: string;
  }> = ({ columnKey, title, className }) => (
    <th
      className={`px-6 py-3 text-xs font-medium uppercase tracking-wider cursor-pointer ${className}`}
      onClick={() => requestSort(columnKey)}
    >
      <div className="flex items-center justify-center">
        <span>{title}</span>
        <SortIndicator sortConfig={sortConfig} columnKey={columnKey} />
      </div>
    </th>
  );

  // Show a loading indicator while auth is resolving or data is being fetched
  if (loading || !authContext?.authIsReady) {
    return (
      <div className="w-full py-[11vh] px-8 md:px-20 text-black bg-gray-100 min-h-screen">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 uppercase mb-8 text-center">
          Player Rankings
        </h1>
        <p className="text-center">Loading rankings...</p>
      </div>
    );
  }

  // Now it's safe to get the user
  const { user } = authContext;

  return (
    <div className="w-full py-[11vh] px-8 md:px-20 text-black bg-gray-100 min-h-screen">
      <button
        onClick={() => setIsInfoModalOpen(true)}
        className="p-3 bg-gray-800 text-white rounded-lg shadow-md hover:bg-black focus:outline-none absolute top-5 right-5 cursor-pointer z-20"
        aria-label="Show info"
      >
        <FaInfoCircle size={20} />
      </button>
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 uppercase mb-8 text-left">
        Player Rankings
      </h1>
      <div
        data-tour-id="ranking-table"
        className="overflow-x-auto bg-white rounded-lg shadow"
      >
        <table className="min-w-full table-auto">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort("displayName")}
              >
                <div className="flex items-center">
                  <span>Player</span>
                  <SortIndicator
                    sortConfig={sortConfig}
                    columnKey="displayName"
                  />
                </div>
              </th>
              <TableHeader
                columnKey="ideasCreated"
                title="Ideas Created"
                className="text-center"
              />
              <TableHeader
                columnKey="commentsPlaced"
                title="Comments Placed"
                className="text-center"
              />
              <TableHeader
                columnKey="ideasInspired"
                title="Ideas Inspired"
                className="text-center"
              />
              <TableHeader
                columnKey="evaluationsMade"
                title="Evaluations Made"
                className="text-center"
              />
              <TableHeader
                columnKey="longestStreak"
                title="Longest Streak"
                className="text-center"
              />
              <TableHeader columnKey="xp" title="XP" className="text-center" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedPlayerStats.map((player, index) => {
              const isCurrentUser = user && player.userId === user.uid;
              const rowClassName = isCurrentUser
                ? "bg-indigo-100 font-semibold"
                : index % 2 === 0
                ? "bg-white"
                : "bg-gray-50";

              return (
                <tr key={player.userId} className={rowClassName}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center">
                      <div className="mr-4 w-6 text-center">{index + 1}</div>
                      <div className="flex-shrink-0 h-10 w-10">
                        {player.profilePic ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={player.profilePic}
                            alt={`${player.displayName}'s avatar`}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-500">
                              {player.displayName.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {player.displayName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {player.ideasCreated}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {player.commentsPlaced}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {player.ideasInspired}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {player.evaluationsMade}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {player.longestStreak} days
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-center ${
                      isCurrentUser ? "text-indigo-600" : "text-gray-800"
                    }`}
                  >
                    {player.xp}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-200 border-t-2 border-gray-300">
            <tr>
              <td className="px-6 py-4 text-sm font-bold text-gray-800 text-left">
                Total
              </td>
              <td className="px-6 py-4 text-sm font-bold text-gray-800 text-center">
                {totals.ideasCreated}
              </td>
              <td className="px-6 py-4 text-sm font-bold text-gray-800 text-center">
                {totals.commentsPlaced}
              </td>
              <td className="px-6 py-4 text-sm font-bold text-gray-800 text-center">
                {totals.ideasInspired}
              </td>
              <td className="px-6 py-4 text-sm font-bold text-gray-800 text-center">
                {totals.evaluationsMade}
              </td>
              <td className="px-6 py-4 text-sm font-bold text-gray-800 text-center">
                -
              </td>
              <td className="px-6 py-4 text-sm font-bold text-indigo-800 text-center">
                {totals.xp}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {isInfoModalOpen && (
        <InfoModal onClose={() => setIsInfoModalOpen(false)} />
      )}
    </div>
  );
};

export default PlayerRankingView;

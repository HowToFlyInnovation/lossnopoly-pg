import React, { useState, useEffect, useMemo, useContext } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { AuthContext } from "../../context/AuthContext";
import { FaInfoCircle } from "react-icons/fa";

// --- TYPE DEFINITIONS ---

interface Player {
  userId: string;
  displayName: string;
  profilePic?: string;
  email: string;
}

interface PlayerDetails {
  email: string;
  team: string;
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
  email: string;
}

interface TeamStats {
  teamName: string;
  invitedPlayers: number;
  registeredPlayers: number;
  ideasCreated: number;
  commentsPlaced: number;
  ideasInspired: number;
  evaluationsMade: number;
  xp: number;
}

type SortableKeys = keyof Omit<PlayerStats, "userId" | "profilePic" | "email">;
type SortDirection = "ascending" | "descending";

interface SortConfig {
  key: SortableKeys;
  direction: SortDirection;
}

// --- INFO MODAL COMPONENT ---
const InfoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-5000"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 text-white p-8 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">How the Rankings Work</h2>
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
              1. View Modes
            </h3>
            <p>
              Use the dropdown menu at the top-right to switch between two
              different ranking views:
            </p>
            <ul className="list-disc list-inside ml-4 my-2 space-y-1">
              <li>
                <strong>On Player Level:</strong> Ranks individual participants
                based on their contributions.
              </li>
              <li>
                <strong>On Team Level:</strong> Ranks the six teams based on
                their collective performance.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              2. Player-Level Ranking
            </h3>
            <p>
              This table ranks all participants based on their contributions.
              You can sort the table by clicking on any of the column headers.
              Your own row is highlighted for easy visibility.
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
              3. Team-Level Ranking
            </h3>
            <p>
              This view provides an overview of how each team is performing on
              average.
            </p>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <p className="font-bold">
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/PlayerRankingsVisual2.png?alt=media&token=fac803f7-ac60-431a-a8b0-b92ff28bad7f"
                  className="w-full"
                />
              </p>
            </div>
            <ul className="list-disc list-inside ml-4 my-2 space-y-1">
              <li>
                <strong>Players:</strong> Shows how many of the invited players
                have registered for the platform (e.g., "12/22" means 12
                registered out of 22 invited).
              </li>
              <li>
                <strong>Average Stats (Avg...):</strong> All other columns show
                the team's total stats divided by the number of{" "}
                <strong>invited</strong> players, giving you the average
                contribution per potential participant.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              4. XP Scoring System
            </h3>
            <p className="italic text-gray-400 mb-4">
              Please note: The final ranking will only be determined after the
              shortlisting activities by the core team and challenge owners. The
              "After Game" XP will be awarded at that time.
            </p>

            <h4 className="text-md font-semibold mb-2 text-gray-300">
              During Game (Quantity of Activities)
            </h4>
            <ul className="list-disc list-inside ml-4 my-2 space-y-2 bg-gray-900 p-4 rounded-lg">
              <li>
                <strong>
                  <span className="text-green-400">+20 XP</span> | Create Your
                  1st Idea
                </strong>
              </li>
              <li>
                <strong>
                  <span className="text-green-400">+15 XP</span> | Create Your
                  2nd Idea
                </strong>
              </li>
              <li>
                <strong>
                  <span className="text-green-400">+10 XP</span> | Create Your
                  3rd Idea
                </strong>
              </li>
              <li>
                <strong>
                  <span className="text-green-400">+5 XP</span>| Create Any
                  Subsequent Idea
                </strong>
              </li>
              <li>
                <strong>
                  <span className="text-green-400">+10 XP</span> | Inspire a New
                  Idea:
                </strong>{" "}
                Awarded when someone builds upon your idea.
              </li>
              <li>
                <strong>
                  <span className="text-green-400">+2 XP</span> | Place a
                  Comment:
                </strong>{" "}
                For each comment you make.
              </li>
              <li>
                <strong>
                  <span className="text-green-400">+2 XP</span> | Make an
                  Evaluation:
                </strong>{" "}
                For each evaluation you complete.
              </li>
              <li>
                <strong>
                  <span className="text-green-400">+5 XP</span> | Daily Activity
                  Streak:
                </strong>{" "}
                For each consecutive <b>weekday</b> you contribute.
              </li>
            </ul>

            <h4 className="text-md font-semibold mb-2 mt-6 text-gray-300">
              After Game (Quality of Activities)
            </h4>
            <ul className="list-disc list-inside ml-4 my-2 space-y-2 bg-gray-900 p-4 rounded-lg">
              <li>
                <strong>
                  <span className="text-green-400">+20 XP</span> | Your Idea is
                  Shortlisted:
                </strong>{" "}
                For each of your ideas that got selected for further review.
              </li>
              <li>
                <strong>
                  <span className="text-green-400">+5 XP</span> | Inspired Idea
                  is Shortlisted:
                </strong>{" "}
                If an idea that was inspired by one of yours got shortlisted.
              </li>
              <li>
                <strong>
                  <span className="text-green-400">+3 XP</span> | Accurate
                  High-Scoring:
                </strong>{" "}
                When an idea you rated highly (top-right quadrant in assessment
                matrix) got shortlisted by the core team.
              </li>
              <li>
                <strong>
                  <span className="text-green-400">+3 XP</span> | Accurate
                  Low-Scoring:
                </strong>{" "}
                When an idea you rated poorly (lower-left quadrant in assessment
                matrix) didn't got shortlisted, confirming your assessment.
              </li>
              <li>
                <strong>
                  <span className="text-red-400">-3 XP </span>| Inaccurate
                  High-Scoring:
                </strong>{" "}
                When an idea you rated highly (top-right quadrant in assessment
                matrix) didn't got shortlisted by the core team.
              </li>
              <li>
                <strong>
                  <span className="text-red-400">-3 XP</span> | Inaccurate
                  Low-Scoring:
                </strong>{" "}
                When an idea you rated poorly (lower-left quadrant in assessment
                matrix) is shortlisted by the core team.
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
  const authContext = useContext(AuthContext);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [viewLevel, setViewLevel] = useState<"player" | "team">("player");
  const [loading, setLoading] = useState(true);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "xp",
    direction: "descending",
  });

  useEffect(() => {
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
          playerDetailsSnapshot,
        ] = await Promise.all([
          getDocs(collection(db, "players")),
          getDocs(collection(db, "ideas")),
          getDocs(collection(db, "comments")),
          getDocs(collection(db, "evaluations")),
          getDocs(collection(db, "playerDetailsCollection")),
        ]);

        const players = playersSnapshot.docs.map(
          (doc) => ({ userId: doc.id, ...doc.data() } as Player)
        );
        const playerDetails = playerDetailsSnapshot.docs.map(
          (doc) => doc.data() as PlayerDetails
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
              const diff = sortedDays[i] - sortedDays[i - 1];
              const previousDay = new Date(
                sortedDays[i - 1] * 24 * 60 * 60 * 1000
              );
              const currentDay = new Date(sortedDays[i] * 24 * 60 * 60 * 1000);
              const dayOfWeekPrevious = previousDay.getDay();
              const dayOfWeekCurrent = currentDay.getDay();

              if (diff === 1) {
                currentStreak++;
              } else if (
                dayOfWeekPrevious === 5 &&
                dayOfWeekCurrent === 1 &&
                diff === 3
              ) {
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
            email: player.email,
          };
        });

        setPlayerStats(finalStats);

        const teams: { [key: string]: PlayerStats[] } = {
          "BLOIS PLANT": [],
          "EUROPE TEAM": [],
          "GLOBAL TEAM": [],
          "URLATI PLANT": [],
          "WARSAW (ESS/SNH)": [],
          OTHERS: [],
        };

        const teamPlayerCounts: {
          [key: string]: { invited: number; registered: number };
        } = {
          "BLOIS PLANT": { invited: 0, registered: 0 },
          "EUROPE TEAM": { invited: 0, registered: 0 },
          "GLOBAL TEAM": { invited: 0, registered: 0 },
          "URLATI PLANT": { invited: 0, registered: 0 },
          "WARSAW (ESS/SNH)": { invited: 0, registered: 0 },
          OTHERS: { invited: 0, registered: 0 },
        };

        playerDetails.forEach((detail) => {
          const teamName = detail.team || "OTHERS";
          if (teamPlayerCounts[teamName]) {
            teamPlayerCounts[teamName].invited++;
          }
        });

        players.forEach((player) => {
          const detail = playerDetails.find((d) => d.email === player.email);
          const teamName = detail ? detail.team : "OTHERS";
          if (teamPlayerCounts[teamName]) {
            teamPlayerCounts[teamName].registered++;
          }
        });

        finalStats.forEach((player) => {
          const detail = playerDetails.find((d) => d.email === player.email);
          const team = detail ? detail.team : "OTHERS";
          if (teams[team]) {
            teams[team].push(player);
          }
        });

        const calculatedTeamStats = Object.keys(teams).map((teamName) => {
          const teamPlayers = teams[teamName];
          const { invited, registered } = teamPlayerCounts[teamName];

          const totalStats = teamPlayers.reduce(
            (acc, player) => {
              acc.ideasCreated += player.ideasCreated;
              acc.commentsPlaced += player.commentsPlaced;
              acc.ideasInspired += player.ideasInspired;
              acc.evaluationsMade += player.evaluationsMade;
              acc.xp += player.xp;
              return acc;
            },
            {
              ideasCreated: 0,
              commentsPlaced: 0,
              ideasInspired: 0,
              evaluationsMade: 0,
              xp: 0,
            }
          );
          return {
            teamName,
            invitedPlayers: invited,
            registeredPlayers: registered,
            ideasCreated: invited > 0 ? totalStats.ideasCreated / invited : 0,
            commentsPlaced:
              invited > 0 ? totalStats.commentsPlaced / invited : 0,
            ideasInspired: invited > 0 ? totalStats.ideasInspired / invited : 0,
            evaluationsMade:
              invited > 0 ? totalStats.evaluationsMade / invited : 0,
            xp: invited > 0 ? totalStats.xp / invited : 0,
          };
        });

        setTeamStats(calculatedTeamStats);
      } catch (error) {
        console.error("Error calculating stats:", error);
      } finally {
        setLoading(false);
      }
    };

    calculateAllStats();
  }, [authContext]);

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

  if (loading || !authContext?.authIsReady) {
    return (
      <div className="w-full py-[11vh] px-8 md:px-20 text-black bg-gray-100 min-h-screen">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 uppercase mb-8 text-center">
          Rankings
        </h1>
        <p className="text-center">Loading rankings...</p>
      </div>
    );
  }

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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 uppercase text-left">
          Rankings
        </h1>
        <select
          value={viewLevel}
          onChange={(e) => setViewLevel(e.target.value as "player" | "team")}
          className="bg-white text-gray-800 font-semibold py-2 px-4 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          <option value="player">On Player Level</option>
          <option value="team">On Team Level</option>
        </select>
      </div>
      <div
        data-tour-id="ranking-table"
        className="overflow-x-auto bg-white rounded-lg shadow"
      >
        {viewLevel === "player" ? (
          <table className="min-w-full table-auto">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Player
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
                <TableHeader
                  columnKey="xp"
                  title="XP"
                  className="text-center"
                />
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
          </table>
        ) : (
          <table className="min-w-full table-auto">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                  Players
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                  Avg Ideas Created
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                  Avg Comments Placed
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                  Avg Ideas Inspired
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                  Avg Evaluations Made
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                  Avg XP
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamStats.map((team, index) => (
                <tr
                  key={team.teamName}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {team.teamName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {`${team.registeredPlayers}/${team.invitedPlayers}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {team.ideasCreated.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {team.commentsPlaced.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {team.ideasInspired.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {team.evaluationsMade.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-center">
                    {team.xp.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {isInfoModalOpen && (
        <InfoModal onClose={() => setIsInfoModalOpen(false)} />
      )}
    </div>
  );
};

export default PlayerRankingView;

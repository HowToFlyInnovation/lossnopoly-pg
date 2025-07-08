import { useContext, useState, useEffect, useRef } from "react";
import { AuthContext, type AuthContextType } from "../../context/AuthContext";
import { doc, collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { FaInfoCircle } from "react-icons/fa";
import { costImpactToMonetaryValue } from "../../../lib/constants";

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

interface PlayerDetails {
  email: string;
  team: string;
}

interface Idea {
  id: string;
  userId: string;
  inspiredBy?: { id: string }[];
  createdAt: any; // Can be improved with a more specific type
  outOfScope?: boolean;
  isNew?: boolean; // Added isNew
  ideationMission: string;
}

interface Evaluation {
  id: string;
  ideaId: string;
  ImpactScore: string;
  FeasibilityScore: string;
  EvaluatorUserId: string;
  EvaluationDate: any;
}

interface TeamData {
  name: string;
  ideas: number;
  comments: number;
  inspirations: number;
  evaluations: number;
  xp: number;
  value: number;
}

interface ChallengeData {
  name: string;
  ideas: number;
  value: number;
}

const feasibilityToRiskAdjustment: { [key: string]: number } = {
  "Very Easy To do": 0.9,
  Manageable: 0.7,
  "Achievable with Effort": 0.5,
  Challenging: 0.25,
  "Very Challenging": 0.1,
};

// --- [NEW] INFO MODAL COMPONENT ---
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
          <h2 className="text-2xl font-bold">
            How to Use the Activity Dashboard
          </h2>
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
              1. Your Profile & All-Time Stats
            </h3>
            <p>
              This top section provides a summary of your contributions and
              allows you to personalize your profile.
            </p>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <p className="font-bold">
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/PlayerDashboardVisual1.png?alt=media&token=16274965-6693-4a5e-b15b-67321fb43372"
                  className="w-full"
                />
              </p>
            </div>
            <ul className="list-disc list-inside ml-4 my-2 space-y-1">
              <li>
                <strong>Profile Picture:</strong> Click the edit icon on your
                picture to upload a new one.
              </li>
              <li>
                <strong>All-Time Stats:</strong> These numbers represent your
                total activity in the ideation space since the beginning.
              </li>
              <li>
                <strong>XP Collected:</strong> Earn Experience Points (XP) for
                various actions like creating ideas, commenting, and evaluating.
                The more you contribute, the more XP you gain!
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              2. Daily Activity Charts
            </h3>
            <p>
              These charts visualize contributions over the last 7 days, giving
              you insight into recent activity trends.
            </p>
            <div className="bg-gray-900 p-4 rounded-lg text-center my-2">
              <p className="font-bold">
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/PlayerDashboardVisual2.png?alt=media&token=7204cbdf-796c-40c8-b206-7dc62fc45bbd"
                  className="w-full"
                />
              </p>
            </div>
            <ul className="list-disc list-inside ml-4 my-2 space-y-1">
              <li>
                <strong>Individual Charts:</strong> Each chart tracks a specific
                action (e.g., Ideas Created, Comments Made). Hover over the bars
                to see the exact numbers for a specific day.
              </li>
              <li>
                <strong>
                  "Only Me" vs. "All Players" vs. "Other Teams" drop-down:
                </strong>{" "}
                Use the drop-down at the top of this section to switch the view.
                'Only Me' shows your personal activity, while 'All Players'
                shows the combined activity of everyone in the ideation space.
                This is great for comparing your contributions to the overall
                trends.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#AF19FF",
  "#FF1919",
];

const CHALLENGE_COLORS: { [key: string]: string } = {
  "E2E Touchless Supply Chain": "rgb(252 211 77)",
  "E2E Touchless Innovation": "rgb(217 119 6)",
  "Zero Waste": "#63b3ed",
};

interface CustomizedLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  value: number;
  name: string;
}

const PlayerPageView = () => {
  const authContext = useContext<AuthContextType | null>(AuthContext);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [teamChartData, setTeamChartData] = useState<TeamData[]>([]);
  const [challengeChartData, setChallengeChartData] = useState<ChallengeData[]>(
    []
  );
  const [filter, setFilter] = useState("me");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playerDetails, setPlayerDetails] = useState<PlayerDetails[]>([]);

  if (!authContext) {
    return <div>Loading...</div>;
  }

  const { user: currentUser } = authContext;

  useEffect(() => {
    const fetchPlayerDetails = async () => {
      const playerDetailsCollection = collection(db, "playerDetailsCollection");
      const playerDetailsSnapshot = await getDocs(playerDetailsCollection);
      const details = playerDetailsSnapshot.docs.map(
        (doc) => doc.data() as PlayerDetails
      );
      setPlayerDetails(details);
    };
    fetchPlayerDetails();
  }, []);

  useEffect(() => {
    const fetchAndProcessData = async () => {
      setLoading(true);
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const [
        ideasSnapshot,
        commentsSnapshot,
        evaluationsSnapshot,
        playersSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "ideas")),
        getDocs(collection(db, "comments")),
        getDocs(collection(db, "evaluations")),
        getDocs(collection(db, "players")),
      ]);

      const ideas = ideasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Idea[];
      const comments = commentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];
      const evaluations = evaluationsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ideaId: data.ideaId,
          ImpactScore: data.ImpactScore,
          FeasibilityScore: data.FeasibilityScore,
          EvaluatorUserId: data.EvaluatorUserId,
          EvaluationDate: data.EvaluationDate,
        };
      }) as Evaluation[];
      const players = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];

      const getPlayerTeam = (email: string) => {
        const player = playerDetails.find((p) => p.email === email);
        return player ? player.team : "OTHERS";
      };

      const filteredPlayerEmails = players
        .filter((p) => {
          if (filter === "me") return p.id === currentUser.uid;
          if (filter === "all") return true;
          return getPlayerTeam(p.email) === filter;
        })
        .map((p) => p.email);

      // --- All-Time Stats Calculation for the current user ---
      const allPlayerIdeas = ideas.filter((i) => i.userId === currentUser.uid);
      const allPlayerComments = comments.filter(
        (c) => c.userId === currentUser.uid
      );
      const allPlayerEvaluations = evaluations.filter(
        (e) => e.EvaluatorUserId === currentUser.uid
      );
      const ideaAuthorMap = new Map(ideas.map((i) => [i.id, i.userId]));
      let allPlayerIdeasInspired = 0;
      ideas.forEach((idea) => {
        if (idea.inspiredBy) {
          idea.inspiredBy.forEach((inspiration: { id: string }) => {
            const inspiringIdeaAuthorId = ideaAuthorMap.get(inspiration.id);
            if (
              inspiringIdeaAuthorId === currentUser.uid &&
              inspiringIdeaAuthorId !== idea.userId
            ) {
              allPlayerIdeasInspired++;
            }
          });
        }
      });

      const ideaTimestamps = allPlayerIdeas.map((a) => a.createdAt);
      const commentTimestamps = allPlayerComments.map((a) => a.createdAt);
      const evaluationTimestamps = allPlayerEvaluations.map(
        (a) => a.EvaluationDate
      );
      const allActionTimestamps = [
        ...ideaTimestamps,
        ...commentTimestamps,
        ...evaluationTimestamps,
      ].filter((ts) => ts && typeof ts.toDate === "function");

      const uniqueDays = new Set(
        allActionTimestamps.map((ts) =>
          Math.floor(ts.toDate().getTime() / (1000 * 60 * 60 * 24))
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

      let totalXp = 0;
      allPlayerIdeas
        .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())
        .forEach((_, index) => {
          if (index === 0) totalXp += 20;
          else if (index === 1) totalXp += 15;
          else if (index === 2) totalXp += 10;
          else totalXp += 5;
        });
      totalXp += allPlayerComments.length * 2;
      totalXp += allPlayerEvaluations.length * 2;
      totalXp += allPlayerIdeasInspired * 10;
      totalXp += longestStreak * 5;
      const allTimeStats: PlayerStats = {
        ideasCreated: allPlayerIdeas.length,
        commentsMade: allPlayerComments.length,
        ideasInspired: allPlayerIdeasInspired,
        evaluationsMade: allPlayerEvaluations.length,
        xpCollected: totalXp,
      };
      setPlayerStats(allTimeStats);

      // --- Daily Stats Calculation ---
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

      const filterActionByUser = (userEmail: string) => {
        if (filter === "me") return userEmail === currentUser.email;
        if (filter === "all") return true;
        return filteredPlayerEmails.includes(userEmail);
      };

      ideas.forEach((doc) => {
        const player = players.find((p) => p.id === doc.userId);
        if (
          player &&
          filterActionByUser(player.email) &&
          doc.createdAt?.toDate
        ) {
          const date = doc.createdAt.toDate().toISOString().split("T")[0];
          const stats = getDailyStat(date);
          stats.ideasCreated += 1;
          stats.xpCollected += 10;
        }
      });
      comments.forEach((doc) => {
        const player = players.find((p) => p.id === doc.userId);
        if (
          player &&
          filterActionByUser(player.email) &&
          doc.createdAt?.toDate
        ) {
          const date = doc.createdAt.toDate().toISOString().split("T")[0];
          const stats = getDailyStat(date);
          stats.commentsMade += 1;
          stats.xpCollected += 2;
        }
      });
      evaluations.forEach((doc) => {
        const player = players.find((p) => p.id === doc.EvaluatorUserId);
        if (
          player &&
          filterActionByUser(player.email) &&
          doc.EvaluationDate?.toDate
        ) {
          const date = doc.EvaluationDate.toDate().toISOString().split("T")[0];
          const stats = getDailyStat(date);
          stats.evaluationsMade += 1;
          stats.xpCollected += 2;
        }
      });
      ideas.forEach((idea) => {
        if (idea.inspiredBy) {
          idea.inspiredBy.forEach((inspiration: { id: string }) => {
            const inspiringIdeaAuthorId = ideaAuthorMap.get(inspiration.id);
            if (
              inspiringIdeaAuthorId &&
              inspiringIdeaAuthorId !== idea.userId &&
              idea.createdAt?.toDate
            ) {
              const player = players.find(
                (p) => p.id === inspiringIdeaAuthorId
              );
              if (player && filterActionByUser(player.email)) {
                const date = idea.createdAt
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
      // --- Team Data Calculation for Pie Charts ---
      const teams: {
        [key: string]: {
          ideas: number;
          comments: number;
          inspirations: number;
          evaluations: number;
          xp: number;
          value: number;
          playerCount: number;
        };
      } = {
        "BLOIS PLANT": {
          ideas: 0,
          comments: 0,
          inspirations: 0,
          evaluations: 0,
          xp: 0,
          value: 0,
          playerCount: 0,
        },
        "EUROPE TEAM": {
          ideas: 0,
          comments: 0,
          inspirations: 0,
          evaluations: 0,
          xp: 0,
          value: 0,
          playerCount: 0,
        },
        "GLOBAL TEAM": {
          ideas: 0,
          comments: 0,
          inspirations: 0,
          evaluations: 0,
          xp: 0,
          value: 0,
          playerCount: 0,
        },
        "URLATI PLANT": {
          ideas: 0,
          comments: 0,
          inspirations: 0,
          evaluations: 0,
          xp: 0,
          value: 0,
          playerCount: 0,
        },
        "WARSAW (ESS/SNH)": {
          ideas: 0,
          comments: 0,
          inspirations: 0,
          evaluations: 0,
          xp: 0,
          value: 0,
          playerCount: 0,
        },
        OTHERS: {
          ideas: 0,
          comments: 0,
          inspirations: 0,
          evaluations: 0,
          xp: 0,
          value: 0,
          playerCount: 0,
        },
      };

      // Group evaluations by idea
      const evaluationsByIdea: { [ideaId: string]: Evaluation[] } = {};
      evaluations.forEach((evalItem) => {
        if (!evaluationsByIdea[evalItem.ideaId]) {
          evaluationsByIdea[evalItem.ideaId] = [];
        }
        evaluationsByIdea[evalItem.ideaId].push(evalItem);
      });

      // Calculate average risk-adjusted value for each idea
      const ideaValues: { [ideaId: string]: number } = {};
      ideas.forEach((idea) => {
        // Exclude out of scope ideas from value calculation unless new
        if (idea.outOfScope && !idea.isNew) {
          return;
        }

        const ideaEvaluations = evaluationsByIdea[idea.id] || [];
        if (ideaEvaluations.length > 0) {
          let sumRiskAdjustedValue = 0;
          ideaEvaluations.forEach((evalItem) => {
            const monetaryValue =
              costImpactToMonetaryValue[evalItem.ImpactScore] || 0;
            const riskAdjustment =
              feasibilityToRiskAdjustment[evalItem.FeasibilityScore] || 0;
            sumRiskAdjustedValue += monetaryValue * riskAdjustment;
          });
          ideaValues[idea.id] = sumRiskAdjustedValue / ideaEvaluations.length;
        }
      });

      players.forEach((player) => {
        const teamName = getPlayerTeam(player.email);
        if (teams[teamName]) {
          teams[teamName].playerCount++;
        }
      });

      ideas.forEach((idea) => {
        const player = players.find((p) => p.id === idea.userId);
        if (player) {
          const teamName = getPlayerTeam(player.email);
          if (teams[teamName]) {
            teams[teamName].ideas++;
            if (ideaValues[idea.id]) {
              teams[teamName].value += ideaValues[idea.id];
            }
          }
        }
      });

      comments.forEach((comment) => {
        const player = players.find((p) => p.id === comment.userId);
        if (player) {
          const teamName = getPlayerTeam(player.email);
          if (teams[teamName]) {
            teams[teamName].comments++;
          }
        }
      });

      evaluations.forEach((evaluation) => {
        const player = players.find((p) => p.id === evaluation.EvaluatorUserId);
        if (player) {
          const teamName = getPlayerTeam(player.email);
          if (teams[teamName]) {
            teams[teamName].evaluations++;
          }
        }
      });

      const inspirationCounts: { [userId: string]: number } = {};
      ideas.forEach((idea) => {
        if (idea.inspiredBy) {
          idea.inspiredBy.forEach((inspiration: { id: string }) => {
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

      players.forEach((player) => {
        const playerIdeas = ideas.filter((i) => i.userId === player.id);
        const playerComments = comments.filter((c) => c.userId === player.id);
        const playerEvaluations = evaluations.filter(
          (e) => e.EvaluatorUserId === player.id
        );
        const ideasInspired = inspirationCounts[player.id] || 0;

        let xp = 0;
        playerIdeas
          .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())
          .forEach((_, index) => {
            if (index === 0) xp += 20;
            else if (index === 1) xp += 15;
            else if (index === 2) xp += 10;
            else xp += 5;
          });
        xp += playerComments.length * 2;
        xp += playerEvaluations.length * 2;
        xp += ideasInspired * 10;

        const teamName = getPlayerTeam(player.email);
        if (teams[teamName]) {
          teams[teamName].xp += xp;
          teams[teamName].inspirations += ideasInspired;
        }
      });

      const chartData: TeamData[] = Object.keys(teams).map((teamName) => ({
        name: teamName,
        ...teams[teamName],
      }));
      setTeamChartData(chartData);

      // --- Challenge Data Calculation for Pie Charts ---
      const challenges: { [key: string]: { ideas: number; value: number } } = {
        "E2E Touchless Supply Chain": { ideas: 0, value: 0 },
        "E2E Touchless Innovation": { ideas: 0, value: 0 },
        "Zero Waste": { ideas: 0, value: 0 },
      };

      ideas.forEach((idea) => {
        if (challenges[idea.ideationMission]) {
          challenges[idea.ideationMission].ideas++;
          if (ideaValues[idea.id] && (!idea.outOfScope || idea.isNew)) {
            challenges[idea.ideationMission].value += ideaValues[idea.id];
          }
        }
      });

      const challengeData: ChallengeData[] = Object.keys(challenges).map(
        (challengeName) => ({
          name: challengeName,
          ...challenges[challengeName],
        })
      );
      setChallengeChartData(challengeData);

      // --- Date Range and Final Stats Generation ---
      const dateRange = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
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
      setLoading(false);
    };

    if (authContext.authIsReady) {
      fetchAndProcessData();
    }
  }, [currentUser, filter, authContext.authIsReady, playerDetails]);

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
        <XAxis
          dataKey="date"
          tickFormatter={(tick) => {
            const [year, month, day] = tick.split("-").map(Number);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            });
          }}
        />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey={dataKey} fill={color} name={name} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = (
    dataKey: keyof TeamData,
    title: string,
    total: number
  ) => {
    const isValue = dataKey === "value";
    const formattedTotal = isValue
      ? `$${Math.round(total).toLocaleString("en-US")}`
      : total.toLocaleString("en-US");

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({
      cx,
      cy,
      midAngle,
      outerRadius,
      value,
    }: CustomizedLabelProps) => {
      const radius = outerRadius * 1.25; // Increase radius to move labels further out
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);

      // Don't render a label if the value is 0
      if (value === 0) {
        return null;
      }

      const formattedValue = isValue
        ? `$${Math.round(value).toLocaleString("en-US")}`
        : value.toLocaleString("en-US");

      return (
        <text
          x={x}
          y={y}
          fill="black"
          textAnchor={x > cx ? "start" : "end"}
          dominantBaseline="central"
          fontSize={12}
        >
          {formattedValue}
        </text>
      );
    };

    return (
      <div>
        <h4 className="relative text-lg font-semibold mb-0 top-6 text-center">{`${title} (${formattedTotal})`}</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={teamChartData}
              dataKey={dataKey}
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              label={renderCustomizedLabel}
              labelLine={false}
            >
              {teamChartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) =>
                isValue
                  ? `$${Math.round(value).toLocaleString("en-US")}`
                  : value.toLocaleString("en-US")
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };
  const renderChallengePieChart = (
    dataKey: keyof ChallengeData,
    title: string,
    total: number
  ) => {
    const isValue = dataKey === "value";
    const formattedTotal = isValue
      ? `$${Math.round(total).toLocaleString("en-US")}`
      : total.toLocaleString("en-US");

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({
      cx,
      cy,
      midAngle,
      outerRadius,
      value,
    }: CustomizedLabelProps) => {
      const radius = outerRadius * 1.25;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);

      if (value === 0) {
        return null;
      }

      const formattedValue = isValue
        ? `$${Math.round(value).toLocaleString("en-US")}`
        : value.toLocaleString("en-US");

      return (
        <text
          x={x}
          y={y}
          fill="black"
          textAnchor={x > cx ? "start" : "end"}
          dominantBaseline="central"
          fontSize={12}
        >
          {formattedValue}
        </text>
      );
    };
    return (
      <div>
        <h4 className="relative text-lg font-semibold mb-0 top-6 text-center">{`${title} (${formattedTotal})`}</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={challengeChartData}
              dataKey={dataKey}
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              label={renderCustomizedLabel}
              labelLine={false}
            >
              {challengeChartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHALLENGE_COLORS[entry.name]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) =>
                isValue
                  ? `$${Math.round(value).toLocaleString("en-US")}`
                  : value.toLocaleString("en-US")
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const totals = teamChartData.reduce(
    (acc, team) => {
      acc.ideas += team.ideas;
      acc.comments += team.comments;
      acc.inspirations += team.inspirations;
      acc.evaluations += team.evaluations;
      acc.xp += team.xp;
      acc.value += team.value;
      return acc;
    },
    { ideas: 0, comments: 0, inspirations: 0, evaluations: 0, xp: 0, value: 0 }
  );

  const challengeTotals = challengeChartData.reduce(
    (acc, challenge) => {
      acc.ideas += challenge.ideas;
      acc.value += challenge.value;
      return acc;
    },
    { ideas: 0, value: 0 }
  );

  if (loading) {
    return (
      <div className="w-full py-[11vh] px-8 md:px-20 text-black bg-gray-100 min-h-screen">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 uppercase mb-8 text-left">
          Activity Dashboard
        </h1>
        <p className="text-center">Loading dashboard...</p>
      </div>
    );
  }
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
        Activity Dashboard
      </h1>
      <div>
        <div
          data-tour-id="player-dashboard-stats"
          className="bg-white rounded-lg shadow-md mb-8 pr-12"
        >
          <div className="flex flex-col md:flex-row p-8 items-center">
            <div className="relative">
              <img
                className="h-40 w-auto"
                src={
                  currentUser?.photoURL ||
                  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/20250620_0625_Missing%20Profile%20Picture_remix_01jy5s96pwf6ys44f43035e1jj.jpg?alt=media&token=5365d680-5f3b-4474-81af-b455271590ae"
                }
                alt="Player profile"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
                accept="image/*,.gif"
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
            {/* Start of changed section */}
            <div className="w-full md:flex-grow md:pl-8">
              <h2 className="text-2xl font-bold text-gray-800">
                {currentUser?.displayName}
              </h2>
              <div className="mt-4 flex flex-col md:flex-row md:justify-between md:items-center bg-gray-100 p-4 md:pr-12 rounded-lg">
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <span className="text-sm text-gray-800">Ideas Created</span>
                  <p className="text-xl font-semibold text-black">
                    {playerStats?.ideasCreated || 0}
                  </p>
                </div>
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <span className="text-sm text-gray-800">Comments Made</span>
                  <p className="text-xl font-semibold text-black">
                    {playerStats?.commentsMade || 0}
                  </p>
                </div>
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <span className="text-sm text-gray-800">Ideas Inspired</span>
                  <p className="text-xl font-semibold text-black">
                    {playerStats?.ideasInspired || 0}
                  </p>
                </div>
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <span className="text-sm text-gray-800">
                    Evaluations Made
                  </span>
                  <p className="text-xl font-semibold text-black">
                    {playerStats?.evaluationsMade || 0}
                  </p>
                </div>
                <div className="text-center md:text-left">
                  <span className="text-sm text-gray-800">XP Collected</span>
                  <p className="text-xl font-semibold text-black">
                    {playerStats?.xpCollected || 0}
                  </p>
                </div>
              </div>
            </div>
            {/* End of changed section */}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Daily Activity</h3>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="me">Only Me</option>
              <option value="all">All Players</option>
              <option value="BLOIS PLANT">Only Blois Plant</option>
              <option value="EUROPE TEAM">Only Europe Team</option>
              <option value="GLOBAL TEAM">Only Global Team</option>
              <option value="URLATI PLANT">Only Urlati Plant</option>
              <option value="WARSAW (ESS/SNH)">Only Warsaw (ESS/SNH)</option>
              <option value="OTHERS">Only Others</option>
            </select>
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
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
            Team Contributions
          </h3>
          <div className="flex justify-center flex-wrap gap-x-4 mb-4">
            <div className="flex flex-row justify-center items-center gap-2">
              <div className="bg-blue-400 w-3 h-3"></div>
              <div className="text-[12px]">Blois Plant</div>
            </div>
            <div className="flex flex-row justify-center items-center gap-2">
              <div className="bg-green-600 w-3 h-3"></div>
              <div className="text-[12px]">Europe Team</div>
            </div>
            <div className="flex flex-row justify-center items-center gap-2">
              <div className="bg-amber-300 w-3 h-3"></div>
              <div className="text-[12px]">Global Team</div>
            </div>
            <div className="flex flex-row justify-center items-center gap-2">
              <div className="bg-amber-600 w-3 h-3"></div>
              <div className="text-[12px]">Urlati Team</div>
            </div>
            <div className="flex flex-row justify-center items-center gap-2">
              <div className="bg-purple-700 w-3 h-3"></div>
              <div className="text-[12px]">Warsaw Team</div>
            </div>
            <div className="flex flex-row justify-center items-center gap-2">
              <div className="bg-red-500 w-3 h-3"></div>
              <div className="text-[12px]">Others Team</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderPieChart("ideas", "Ideas", totals.ideas)}
            {renderPieChart("comments", "Comments", totals.comments)}
            {renderPieChart(
              "inspirations",
              "Inspirations",
              totals.inspirations
            )}
            {renderPieChart("evaluations", "Evaluations", totals.evaluations)}
            {renderPieChart("xp", "XP", totals.xp)}
            {renderPieChart("value", "Total Value Created", totals.value)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
            Idea across Sub-Challenges
          </h3>
          <div className="flex justify-center flex-wrap gap-x-4 mb-4">
            {Object.entries(CHALLENGE_COLORS).map(([name, color]) => (
              <div key={name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-xs">{name}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderChallengePieChart(
              "ideas",
              "Number of Ideas",
              challengeTotals.ideas
            )}
            {renderChallengePieChart(
              "value",
              "Generated Value",
              challengeTotals.value
            )}
          </div>
        </div>
      </div>
      {isInfoModalOpen && (
        <InfoModal onClose={() => setIsInfoModalOpen(false)} />
      )}
    </div>
  );
};

export default PlayerPageView;

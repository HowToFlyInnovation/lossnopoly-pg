import React, { useState, useEffect, useContext } from "react";
import { db } from "../../firebase/config";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { AuthContext, type AuthContextType } from "../../context/AuthContext";
import {
  FaLightbulb,
  FaExchangeAlt,
  FaTrashAlt,
  FaRocket,
  FaBullseye,
  FaComments,
} from "react-icons/fa";
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
interface HomePageViewProps {
  handleMissionClick: (contentId: string) => void;
  handleSignOut: () => void;
}

interface ChallengeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface Idea {
  id: string;
  shortDescription: string;
  ideationMission: string;
  imageUrl?: string;
  ideaNumber?: number;
}

interface Evaluation {
  ideaId: string;
  ImpactScore: string;
}

const costImpactNumericalMapping: { [key: string]: number } = {
  Negative: 1,
  "$0-$10K": 2,
  "$10K-$30K": 3,
  "$30K-$100K": 4,
  "$100K-$250K": 5,
  "$250K-$500K": 6,
  "$500K-$1M": 7,
  "$1M+": 8,
};

const numericalToMonetaryValueMapping: { [key: number]: number } = {
  1: 0,
  2: 5_000,
  3: 20_000,
  4: 65_000,
  5: 175_000,
  6: 375_000,
  7: 750_000,
  8: 1_500_000,
};

const TARGET_SAVINGS_MILLIONS = 25; // Target in millions
const TARGET_SAVINGS_VALUE = TARGET_SAVINGS_MILLIONS * 1_000_000;

// --- SUB-COMPONENTS ---

const ChallengeCard: React.FC<ChallengeCardProps> = ({
  icon,
  title,
  description,
}) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6 text-center hover:shadow-xl transition-shadow duration-300 flex flex-col items-center">
    <div className="text-4xl text-monopoly-red mb-4">{icon}</div>
    <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
    <p className="text-base text-gray-600">{description}</p>
  </div>
);

const HowItWorksCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="bg-gray-50 rounded-lg p-6 flex items-start space-x-4">
    <div className="flex-shrink-0 text-2xl text-monopoly-red-darker">
      {icon}
    </div>
    <div>
      <h4 className="text-lg font-bold text-gray-800">{title}</h4>
      <p className="text-gray-600">{children}</p>
    </div>
  </div>
);

// --- HOME PAGE VIEW COMPONENT ---
const HomePageView: React.FC<HomePageViewProps> = ({
  handleMissionClick,
  handleSignOut,
}) => {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [totalIdentifiedSavings, setTotalIdentifiedSavings] =
    useState<number>(0);
  const [numberOfIdeasWithEvaluations, setNumberOfIdeasWithEvaluations] =
    useState<number>(0);
  const [averageMonetaryValuePerIdea, setAverageMonetaryValuePerIdea] =
    useState<number>(0);
  const [loadingSavings, setLoadingSavings] = useState(true);
  const { user } = useContext(AuthContext) as AuthContextType;

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (user) {
        const playerDocRef = doc(db, "players", user.uid);
        try {
          const playerDocSnap = await getDoc(playerDocRef);
          if (playerDocSnap.exists()) {
            setPlayerName(playerDocSnap.data().displayName);
          } else {
            setPlayerName(user.displayName);
          }
        } catch (error) {
          console.error("Error fetching player data:", error);
          setPlayerName(user.displayName);
        }
      }
    };

    fetchPlayerData();
  }, [user]);

  useEffect(() => {
    const calculateTotalSavings = async () => {
      setLoadingSavings(true);
      try {
        const [ideasSnapshot, evaluationsSnapshot] = await Promise.all([
          getDocs(collection(db, "ideas")),
          getDocs(collection(db, "evaluations")),
        ]);

        const ideas = ideasSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Idea[];
        const evaluations = evaluationsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ideaId: data.ideaId as string,
            ImpactScore: data.ImpactScore as string,
          };
        }) as Evaluation[];

        const evaluationsByIdea: { [ideaId: string]: Evaluation[] } = {};
        evaluations.forEach((evalItem) => {
          if (!evaluationsByIdea[evalItem.ideaId]) {
            evaluationsByIdea[evalItem.ideaId] = [];
          }
          evaluationsByIdea[evalItem.ideaId].push(evalItem);
        });

        let totalSavings = 0;
        let ideasContributing = 0;

        ideas.forEach((idea) => {
          const ideaEvaluations = evaluationsByIdea[idea.id] || [];
          if (ideaEvaluations.length > 0) {
            let sumImpactScores = 0;
            ideaEvaluations.forEach((evalItem) => {
              const numericalScore =
                costImpactNumericalMapping[evalItem.ImpactScore];
              if (numericalScore !== undefined) {
                sumImpactScores += numericalScore;
              }
            });
            const averageNumericalImpact =
              sumImpactScores / ideaEvaluations.length;
            const roundedAverageIndex = Math.round(averageNumericalImpact);
            const estimatedMonetaryValue =
              numericalToMonetaryValueMapping[roundedAverageIndex];
            if (estimatedMonetaryValue !== undefined) {
              totalSavings += estimatedMonetaryValue;
              ideasContributing++;
            }
          }
        });
        setTotalIdentifiedSavings(totalSavings);
        setNumberOfIdeasWithEvaluations(ideasContributing);

        let avgMonetaryPerIdea = 0;
        if (ideasContributing > 0) {
          avgMonetaryPerIdea = totalSavings / ideasContributing;
        }
        setAverageMonetaryValuePerIdea(avgMonetaryPerIdea);
      } catch (error) {
        console.error("Error calculating total savings:", error);
        setTotalIdentifiedSavings(0);
        setNumberOfIdeasWithEvaluations(0);
        setAverageMonetaryValuePerIdea(0);
      } finally {
        setLoadingSavings(false);
      }
    };
    calculateTotalSavings();
  }, []);

  const chartData = [
    {
      name: "Identified Savings",
      value: totalIdentifiedSavings / 1_000_000,
      fill: "#82ca9d",
    },
    {
      name: "Target",
      value: TARGET_SAVINGS_MILLIONS,
      fill: "#8884d8",
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow-md text-sm text-gray-800">
          <p className="font-bold">{`${label}`}</p>
          <p className="text-green-600">{`${payload[0].name}: ${formatCurrency(
            payload[0].value * 1_000_000
          )}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* --- HEADER --- */}
      <header className="text-center relative px-5 pt-20 pb-12 bg-white shadow-md">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800">
          {playerName ? `Welcome, ${playerName}!` : "Welcome to lossNOpoly!"}
        </h1>
        <p className="text-lg text-gray-600 mt-4 max-w-3xl mx-auto">
          Your ideas are the key to unlocking the next generation of savings and
          transforming our future. Let's build it together.
        </p>
        <button
          onClick={handleSignOut}
          className="absolute top-4 right-4 py-2 px-4 bg-monopoly-red text-white font-semibold rounded-lg shadow-md hover:bg-monopoly-red-darker focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transition-colors duration-300"
        >
          Sign Out
        </button>
      </header>

      <main className="p-8 md:p-12 bg-monopoly-green-light">
        <div className="max-w-6xl mx-auto">
          {/* --- VIDEO PLACEHOLDER & MISSION --- */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center mb-12">
            <div className="lg:col-span-2 text-left">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Our Mission: Fueling the NSS 3.0 Program
              </h2>
              <p className="text-gray-700">
                In a challenging economic landscape, your creativity is our most
                valuable asset. Through the LossNopoly Hair Care Game, we will
                engage our teams, foster brilliant ideas, and drive cost-saving
                projects. Our goal is to build a powerful pipeline of quick wins
                and strategic future bets to enhance our performance and fuel
                our growth for the next three years.
              </p>
            </div>
            <div className="lg:col-span-3 bg-black rounded-lg flex items-center justify-center aspect-video">
              <p className="text-white font-bold text-xl">
                Video from Challenge Owner
              </p>
            </div>
          </div>

          {/* --- Total Identified Savings Section --- */}
          <div className="text-center mb-12 bg-white mt-12 p-12 rounded-lg shadow-md">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">
              Total Identified YoY Savings
            </h2>
            <div className="flex flex-col items-center justify-center mb-8">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/ChrisOutOfJail.png?alt=media&token=159ff161-6ada-45eb-939a-f7eb795afb4c"
                alt="Chris out of jail"
                className="w-48 h-auto mb-4"
              />
              {loadingSavings ? (
                <p className="text-gray-600">Calculating savings...</p>
              ) : (
                <div className="w-full max-w-2xl h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={chartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => `$${value}M`}
                      />
                      <YAxis type="category" dataKey="name" width={120} />
                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        content={<CustomTooltip />}
                      />
                      <Legend />
                      <Bar dataKey="value" name="Savings in Millions" />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-lg font-semibold text-gray-700 mt-4">
                    Current Identified Savings:{" "}
                    {formatCurrency(totalIdentifiedSavings)} (Target:{" "}
                    {formatCurrency(TARGET_SAVINGS_VALUE)})
                  </p>
                  {numberOfIdeasWithEvaluations > 0 && (
                    <p className="text-md text-gray-700 mt-2">
                      This is based on{" "}
                      <strong>{numberOfIdeasWithEvaluations}</strong> ideas with
                      an average estimated saving of{" "}
                      <strong>
                        {formatCurrency(averageMonetaryValuePerIdea)}
                      </strong>{" "}
                      per idea.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* --- SUB-CHALLENGES --- */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 mt-24">
              Our Three Core Challenges
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ChallengeCard
                icon={<FaExchangeAlt />}
                title="E2E Touchless Supply Chain"
                description="How might we radically reduce touches in our operations and non-operations by 50% through smart automation and reimagined work processes?"
              />
              <ChallengeCard
                icon={<FaRocket />}
                title="E2E Touchless Innovation"
                description="How might we cut touches on new initiatives by 50%? Let's streamline our processes to achieve a $0 GMC budget for offline qualifications."
              />
              <ChallengeCard
                icon={<FaTrashAlt />}
                title="Zero Waste Challenge"
                description="How might we slash material utilization by 50%? We're looking for breakthrough ideas in equipment, processes, and procedures."
              />
            </div>
          </div>
          {/* --- HOW IT WORKS --- */}
          <div className="text-center mb-12 bg-white mt-12 p-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-2 mt-24">
              How to Participate?
            </h2>
            <p className="text-gray-600 max-w-4xl mx-auto mb-8">
              Navigate using the side menu to explore the platform. Your main
              hub is the <strong>Ideation Space</strong>, where you can
              contribute in three key ways.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <HowItWorksCard icon={<FaLightbulb />} title="Share an Idea">
                Submit your innovative solutions. Big or small, every idea has
                the potential to make a huge impact.
              </HowItWorksCard>
              <HowItWorksCard icon={<FaBullseye />} title="Evaluate Ideas">
                Assess ideas from your colleagues on their impact and
                feasibility. Your perspective is crucial for identifying top
                solutions.
              </HowItWorksCard>
              <HowItWorksCard icon={<FaComments />} title="Join the Discussion">
                Comment, ask questions, and build upon the concepts shared by
                others. Collaboration is the key to refining great ideas.
              </HowItWorksCard>
            </div>
            <button
              onClick={() => handleMissionClick("IdeationSpace")}
              className="mt-8 py-3 px-8 bg-monopoly-red-darker text-white font-bold text-lg rounded-lg shadow-lg hover:bg-monopoly-red focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-all duration-300 transform hover:scale-105 flex items-center mx-auto"
            >
              <FaRocket className="mr-3" />
              Go to the Ideation Space
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePageView;

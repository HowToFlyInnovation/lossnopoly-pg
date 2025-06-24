import React, { useState, useEffect, useContext } from "react";
import { db } from "../../firebase/config";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { AuthContext, type AuthContextType } from "../../context/AuthContext";
import {
  FaLightbulb,
  FaRocket,
  FaBullseye,
  FaComments,
  FaArrowRight,
} from "react-icons/fa";
import { costImpactToMonetaryValue } from "../../../lib/constants";

// --- TYPE DEFINITIONS ---
interface HomePageViewProps {
  handleMissionClick: (contentId: string) => void;
  handleSignOut: () => void;
}

interface ChallengeCardProps {
  iconUrl: string;
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

const TARGET_SAVINGS_MILLIONS = 25;
const TARGET_SAVINGS_VALUE = TARGET_SAVINGS_MILLIONS * 1_000_000;

// --- ASSET URLS ---
const videoPlaceholderUrl =
  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/Video_Placeholder.png?alt=media&token=ac8ca86c-d067-4de9-9f7a-b1bdf59bff59";
const supplyChainIconUrl =
  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/SupplyChainIcon.png?alt=media&token=f159705a-e5bc-4845-b1b5-956d737e50b8";
const innovationIconUrl =
  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/InnovationIcon.png?alt=media&token=a3b44e89-2b77-4769-8587-1b4a9ed6e733";
const wasteIconUrl =
  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/WasteIcon.png?alt=media&token=638d527e-9609-4f71-8a73-9299a48e3009";

// TODO: Replace these with the actual URLs for your images
const chrisTopHatImage =
  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/Video_Placeholder.png?alt=media&token=ac8ca86c-d067-4de9-9f7a-b1bdf59bff59";
const monopolyJailImage =
  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/ChrisOutOfJail.png?alt=media&token=159ff161-6ada-45eb-939a-f7eb795afb4c";

// --- SUB-COMPONENTS ---

const ChallengeCard: React.FC<ChallengeCardProps> = ({
  iconUrl,
  title,
  description,
}) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6 text-center hover:shadow-xl transition-shadow duration-300 flex flex-col items-center h-full">
    <img src={iconUrl} alt={`${title} icon`} className="h-16 mb-4" />
    <h3 className="text-xl font-bold text-gray-800 mb-2 uppercase">{title}</h3>
    <p className="text-base text-gray-600">{description}</p>
  </div>
);

const HowItWorksCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="bg-gray-50 rounded-lg p-6 flex items-start space-x-4 h-full">
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
const HomePageView: React.FC<HomePageViewProps> = ({ handleMissionClick }) => {
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
            setPlayerName(playerDocSnap.data().displayName || "TopHat");
          } else {
            setPlayerName(user.displayName || "TopHat");
          }
        } catch (error) {
          console.error("Error fetching player data:", error);
          setPlayerName(user.displayName || "TopHat");
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
            let sumMonetaryValue = 0;
            ideaEvaluations.forEach((evalItem) => {
              const monetaryValue =
                costImpactToMonetaryValue[evalItem.ImpactScore];
              if (monetaryValue !== undefined) {
                sumMonetaryValue += monetaryValue;
              }
            });
            const averageMonetaryValue =
              sumMonetaryValue / ideaEvaluations.length;
            totalSavings += averageMonetaryValue;
            ideasContributing++;
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const progressPercentage = Math.min(
    (totalIdentifiedSavings / TARGET_SAVINGS_VALUE) * 100,
    100
  );

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* --- HEADER --- */}
      <header
        data-tour-id="home-welcome"
        className="text-center relative px-5 pt-20 pb-12 bg-white shadow-md"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800">
          Welcome, {playerName || "TopHat"}!
        </h1>
        <p className="text-lg text-gray-600 mt-4 max-w-3xl mx-auto">
          Every great game starts with one bold move. Your ideas are the key to
          unlocking the next generation of savings. Let's play to win, together.
        </p>
      </header>

      <main className="p-8 md:p-12 bg-monopoly-green-light">
        <div className="max-w-6xl mx-auto">
          {/* --- TOP SECTION: Intro & Image --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-16">
            <div className="text-left bg-white p-8 rounded-lg shadow-md">
              <p className="text-gray-700 mb-6">
                You've been hand-picked to collaborate with your European and
                Global colleagues to turn fresh thinking into feasible ideas
                that fuel growth and ensure sufficient savings over the next 3
                years.
              </p>
              <a
                href={videoPlaceholderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-monopoly-red font-bold flex items-center gap-2 mb-4 hover:underline"
              >
                <FaArrowRight /> Watch the short video to get started
              </a>
              <div className="border-t border-gray-200 pt-4 mt-4">
                <a
                  href="#"
                  className="text-monopoly-red font-bold flex items-center gap-2 hover:underline"
                >
                  <FaArrowRight />
                  <div>
                    <span>Been here before? </span>
                    <span className="underline">Jump to Savings Tracker.</span>
                    <br />
                    <span>Are we close enough to break Chris out yet!?</span>
                  </div>
                </a>
              </div>
            </div>
            <div className="flex justify-center items-center">
              <img
                src={chrisTopHatImage}
                alt="Man in top hat"
                className="rounded-lg shadow-lg max-w-full h-auto"
              />
            </div>
          </div>

          {/* --- HIGH STAKES CHALLENGES --- */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Our Three High Stakes Challenges
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto mb-8">
              What could be simpler, smarter... or skipped entirely? These 3
              challenges are here to focus your thinking and unlock new
              possibilities. Where do you see hidden potential, or a chance to
              do things differently?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ChallengeCard
                iconUrl={supplyChainIconUrl}
                title="TOUCHLESS SUPPLY CHAIN"
                description="How can we reduce 50% of the touches and complexity from the complete process of producing goods?"
              />
              <ChallengeCard
                iconUrl={innovationIconUrl}
                title="TOUCHLESS INNOVATION"
                description="How can we reduce 50% of the cost to prove to learn something new including reducing our GMC costs by 50%?"
              />
              <ChallengeCard
                iconUrl={wasteIconUrl}
                title="ZERO WASTE CHALLENGE"
                description="How can we reduce our material and packaging waste in production?"
              />
            </div>
          </div>

          {/* --- HOW TO PARTICIPATE --- */}
          <div className="text-center mb-16 bg-white p-12 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              How to Participate?
            </h2>
            <p className="text-gray-600 max-w-4xl mx-auto mb-8">
              Navigate using the side menu to explore the platform. Your main
              hub is the <strong>Ideation Space</strong>, where you can
              contribute in three key ways.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <HowItWorksCard icon={<FaLightbulb />} title="Share an idea">
                Submit your innovative solutions. Big or small, every idea has
                the potential to make a huge impact.
                <br />
                <em className="text-sm">Remember it's anonymous.</em>
              </HowItWorksCard>
              <HowItWorksCard icon={<FaBullseye />} title="Evaluate ideas">
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

          {/* --- SAVINGS TRACKER --- */}
          <div className="text-center bg-white p-12 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">
              Total Identified YoY Savings
            </h2>
            <div className="flex flex-col items-center justify-center">
              <img
                src={monopolyJailImage}
                alt="Mr. Monopoly in jail"
                className="w-48 h-auto mb-6"
              />
              {loadingSavings ? (
                <p className="text-gray-600">Calculating savings...</p>
              ) : (
                <div className="w-full max-w-3xl">
                  <div className="bg-gray-200 rounded-full h-4 relative">
                    <div
                      className="bg-monopoly-red h-4 rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>$0</span>
                    <span>$5M</span>
                    <span>$10M</span>
                    <span>$15M</span>
                    <span>$20M</span>
                    <span>$25M</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-700 mt-4">
                    Current Identified Savings:{" "}
                    <strong>{formatCurrency(totalIdentifiedSavings)}</strong>{" "}
                    (Target: {formatCurrency(TARGET_SAVINGS_VALUE)})
                  </p>
                  {numberOfIdeasWithEvaluations > 0 && (
                    <p className="text-md text-gray-600 mt-2">
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
        </div>
      </main>
    </div>
  );
};

export default HomePageView;

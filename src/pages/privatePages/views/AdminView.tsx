import React, { useState, useEffect, useContext } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { AuthContext, type AuthContextType } from "../../context/AuthContext";
import * as ExcelJS from "exceljs";

// --- Constants for Calculation ---
const costImpactToMonetaryValue: { [key: string]: number } = {
  Negative: 0,
  "$0-$50K": 25000,
  "$50K-$100K": 75000,
  "$100K-$250K": 175000,
  "$250K-$500K": 375000,
  "$500K-$1MM": 750000,
  "$1MM+": 1500000,
};

const feasibilityToRiskAdjustment: { [key: string]: number } = {
  "Very Easy To do": 0.9,
  Manageable: 0.7,
  "Achievable with Effort": 0.5,
  Challenging: 0.3,
  "Very Challenging": 0.1,
};

const costImpactOptions = Object.keys(costImpactToMonetaryValue);
const feasibilityOptions = Object.keys(feasibilityToRiskAdjustment);

interface Player {
  userId: string;
  email: string;
  displayName: string;
}

interface PlayerDetails {
  adminRights?: boolean;
}

interface Evaluation {
  id: string;
  ideaId: string;
  ImpactScore: string;
  FeasibilityScore: string;
  [key: string]: any;
}

// A generic transformer for all data types
const genericTransformForExport = (data: any[]) => {
  return data.map((item) => {
    const newItem: { [key: string]: any } = { ...item };
    // Remove email and approved fields for privacy/cleanliness
    delete newItem.email;
    delete newItem.EvaluatorEmail;
    delete newItem.IdeaOwnerEmail;
    delete newItem.approved; // Removes the 'approved' column

    // Convert Timestamps to JS Dates for XLSX compatibility
    for (const key in newItem) {
      if (newItem[key] instanceof Timestamp) {
        newItem[key] = newItem[key].toDate();
      }
    }
    return newItem;
  });
};

// A specific transformer for adding evaluation data to ideas
const transformIdeasForExport = (
  data: any[],
  evaluationStats: {
    [key: string]: { count: number; impactSum: number; feasibilitySum: number };
  }
) => {
  return data.map((item) => {
    const newItem = { ...item }; // item is already a clean object
    const stats = evaluationStats[item.id];

    // Add "New" and "Out of Scope" columns
    newItem["New"] = item.isNew ? "Yes" : "No";
    newItem["Out of Scope"] = item.outOfScope ? "Yes" : "No";

    if (stats && stats.count > 0) {
      const averageImpactScore = stats.impactSum / stats.count;
      const averageFeasibilityScore = stats.feasibilitySum / stats.count;

      const averageImpactIndex = Math.round(averageImpactScore);
      const averageFeasibilityIndex = Math.round(averageFeasibilityScore);

      const averageImpactString =
        costImpactOptions[averageImpactIndex] || "Negative";
      const averageFeasibilityString =
        feasibilityOptions[averageFeasibilityIndex] || "Very Challenging";

      const monetaryValue = costImpactToMonetaryValue[averageImpactString] || 0;
      const riskAdjustment =
        feasibilityToRiskAdjustment[averageFeasibilityString] || 0;

      const riskAdjustedValue = monetaryValue * riskAdjustment;

      newItem["Evaluation Count"] = stats.count;
      newItem["Average Impact Score (score on 6)"] =
        averageImpactScore.toFixed(2);
      newItem["Average Feasibility Score (score on 4)"] =
        averageFeasibilityScore.toFixed(2);
      newItem["Risk Adjusted Value"] = Math.round(riskAdjustedValue);
    } else {
      newItem["Evaluation Count"] = 0;
      newItem["Average Impact Score (score on 6)"] = 0;
      newItem["Average Feasibility Score (score on 4)"] = 0;
      newItem["Risk Adjusted Value"] = 0;
    }

    return newItem;
  });
};

const AdminView: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useContext(AuthContext) as AuthContextType;

  useEffect(() => {
    const checkAdminRights = async () => {
      if (user) {
        try {
          const playerDetailsQuery = query(
            collection(db, "playerDetailsCollection"),
            where("email", "==", user.email)
          );
          const querySnapshot = await getDocs(playerDetailsQuery);

          if (!querySnapshot.empty) {
            const playerDetailsDoc = querySnapshot.docs[0];
            const playerData = playerDetailsDoc.data() as PlayerDetails;

            if (playerData.adminRights === true) {
              setIsAdmin(true);
              const playersSnapshot = await getDocs(collection(db, "players"));
              const playersList = playersSnapshot.docs.map(
                (doc) => doc.data() as Player
              );
              setPlayers(playersList);
            }
          }
        } catch (error) {
          console.error("Error fetching player data:", error);
        }
      }
      setLoading(false);
    };

    checkAdminRights();
  }, [user]);

  const handleDownload = async (collectionName: string, fileName: string) => {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Apply generic transformations first
      let transformedData = genericTransformForExport(data);

      // If downloading ideas, apply the additional specific transformations
      if (collectionName === "ideas") {
        const evaluationStats: {
          [key: string]: {
            count: number;
            impactSum: number;
            feasibilitySum: number;
          };
        } = {};
        const evaluationsSnapshot = await getDocs(
          collection(db, "evaluations")
        );
        const evaluations = evaluationsSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Evaluation)
        );

        evaluations.forEach((evaluation) => {
          const { ideaId, ImpactScore, FeasibilityScore } = evaluation;
          if (!evaluationStats[ideaId]) {
            evaluationStats[ideaId] = {
              count: 0,
              impactSum: 0,
              feasibilitySum: 0,
            };
          }
          evaluationStats[ideaId].count++;
          // Ensure scores are valid before calling indexOf
          if (ImpactScore && FeasibilityScore) {
            evaluationStats[ideaId].impactSum +=
              costImpactOptions.indexOf(ImpactScore);
            evaluationStats[ideaId].feasibilitySum +=
              feasibilityOptions.indexOf(FeasibilityScore);
          }
        });

        transformedData = transformIdeasForExport(
          transformedData,
          evaluationStats
        );
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Data");

      // Add headers and set column formats
      if (transformedData.length > 0) {
        worksheet.columns = Object.keys(transformedData[0]).map((key) => ({
          header: key,
          key: key,
          width: 25,
        }));

        if (collectionName === "ideas") {
          const riskValueColumn = worksheet.getColumn("Risk Adjusted Value");
          riskValueColumn.numFmt = '"$"#,##0';
        }
      }

      // Add data rows
      worksheet.addRows(transformedData);

      // Generate buffer and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
    } catch (error) {
      console.error("Error downloading data: ", error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return <div>You are not authorized to view this page.</div>;
  }

  return (
    <div className="p-8" data-tour-id="admin-view">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">
          Registered Users ({players.length})
        </h2>
        <div className="max-h-60 overflow-y-auto border p-2">
          <ul>
            {players.map((player) => (
              <li key={player.email}>{player.email}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="space-x-4">
        <button
          onClick={() => handleDownload("ideas", "ideas.xlsx")}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Download all ideas
        </button>
        <button
          onClick={() => handleDownload("evaluations", "evaluations.xlsx")}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Download all evaluations
        </button>
        <button
          onClick={() => handleDownload("comments", "comments.xlsx")}
          className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
        >
          Download all comments
        </button>
      </div>
    </div>
  );
};

export default AdminView;

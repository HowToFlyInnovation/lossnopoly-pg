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
import * as ExcelJS from "exceljs"; // 👈 Import exceljs

interface Player {
  userId: string;
  email: string;
  displayName: string;
}

interface PlayerDetails {
  adminRights?: boolean;
}

interface Idea {
  id: string;
  [key: string]: any;
}

interface Evaluation {
  id: string;
  [key: string]: any;
}

interface Comment {
  id: string;
  [key: string]: any;
}

const transformDataForExport = (data: (Idea | Evaluation | Comment)[]) => {
  return data.map((item) => {
    const newItem: { [key: string]: any } = { ...item };
    // Remove email for privacy
    delete newItem.email;
    delete newItem.EvaluatorEmail;
    delete newItem.IdeaOwnerEmail;

    // Convert Timestamps to JS Dates for XLSX compatibility
    for (const key in newItem) {
      if (newItem[key] instanceof Timestamp) {
        newItem[key] = newItem[key].toDate();
      }
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
      })) as Idea[] | Evaluation[] | Comment[];
      const transformedData = transformDataForExport(data);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Data");

      // Add headers
      worksheet.columns = Object.keys(transformedData[0] || {}).map((key) => ({
        header: key,
        key: key,
        width: 20, // Adjust column width as needed
      }));

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

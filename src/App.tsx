import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import LoginPage from "./pages/publicPages/LoginPage.tsx";
import RegisterPage from "./pages/publicPages/RegisterPage.tsx";
import IdeationHomePage from "./pages/privatePages/IdeationHomePage.tsx";

const App: React.FC = () => {
  const [menuActive, setMenuActive] = useState<boolean>(false);
  const [, setVisibleContent] = useState<string>("some-default-view");
  const customTheme = true;

  return (
    <div className="App">
      {/* 3. USE the real components. They will handle the URL logic automatically. */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/homepage"
            element={
              <IdeationHomePage
                customTheme={customTheme}
                menuActive={menuActive}
                setMenuActive={setMenuActive}
                setVisibleContent={setVisibleContent}
              />
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;

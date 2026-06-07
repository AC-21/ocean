import React from "react";
import ReactDOM from "react-dom/client";
import OceanPhysicsApp from "./OceanPhysicsApp";

ReactDOM.createRoot(document.querySelector("#root") as HTMLElement).render(
  <React.StrictMode>
    <OceanPhysicsApp />
  </React.StrictMode>
);

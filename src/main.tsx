import React from "react";
import ReactDOM from "react-dom/client";
import "./assets/css/style.css";
import { RouterProvider } from "react-router";
import router from "./routes/Routes";
import { RepositoryProvider } from "@/context/repository-context";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RepositoryProvider>
      <RouterProvider router={router} />
    </RepositoryProvider>
  </React.StrictMode>,
);

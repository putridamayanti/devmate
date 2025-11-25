import { createBrowserRouter } from "react-router";
import HomePage from "@/pages/home/HomePage.tsx";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import RepositoryPage from "@/pages/repository/RepositoryPage";
import AppLayout from "@/layouts/app-layout";
import ChangePage from "@/pages/repository/ChangePage";
import CommitPage from "@/pages/repository/CommitPage";
import RemotesPage from "@/pages/repository/RemotesPage";

const router = createBrowserRouter([
  { index: true, element: <HomePage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "repository", element: <RepositoryPage /> },
      { path: "repository/changes", element: <ChangePage /> },
      { path: "repository/commits", element: <CommitPage /> },
      { path: "repository/remotes", element: <RemotesPage /> },
    ],
  },
]);

export default router;

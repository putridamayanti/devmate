import { useState } from "react";
import DashboardRemoteRepositorySection from "./components/DashboardRemoteRepositorySection";
import DashboardLocalRepositorySection from "./components/DashboardLocalRepositorySection";
import {Button} from "@/components/ui/button.tsx";

export default function DashboardPage() {
  const tabs = ["Local Repository", "Remote Repository"];

  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
      <main>
        <header className="h-20 w-full bg-gray-100">
          <div className="max-w-2/3 min-h-full mx-auto flex items-center justify-center gap-6">
            {tabs.map((e, i) => (
              <Button
               key={i}
               className="!h-12"
               color="secondary"
               variant={activeTab === tabs[i] ? 'tonal' : 'ghost'} 
               onClick={() => setActiveTab(tabs[i])}>
                {e}
              </Button>
            ))}
          </div>
        </header>

        <div className="min-h-screen max-w-3/4 mx-auto p-4">
          {activeTab === tabs[0] ? (
              <DashboardLocalRepositorySection/>
          ) : (
              <DashboardRemoteRepositorySection/>
          )}
        </div>
      </main>
  );
}

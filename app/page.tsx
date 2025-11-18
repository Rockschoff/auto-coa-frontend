/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Session } from "next-auth";
import { signIn } from "next-auth/react"; // signIn is kept for the original login flow reference
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, BarChart2, Table, Upload } from "lucide-react";

// --- START: RESTORED COMPONENT IMPORTS ---
import FileUpload from "@/components/FileUpload"; 
import DataTab from "@/components/DataTab"; 
import InsightsTab from "@/components/InsightsTab";
// --- END: RESTORED COMPONENT IMPORTS ---

// --- START: MOCK SESSION DEFINITIONS ---
type MockSession = {
  user: { name: string; email: string };
  organization_id: string;
  tenant_id: string;
} | null;

type MockStatus = "loading" | "authenticated" | "unauthenticated";

/**
 * MOCK: Simulates the next-auth useSession hook using localStorage for persistence.
 */
function useMockSession(): { data: MockSession; status: MockStatus } {
  const [data, setData] = useState<MockSession>(null);
  const [status, setStatus] = useState<MockStatus>("loading");

  useEffect(() => {
    // 1. Check localStorage for mock session status
    const mockStatus = localStorage.getItem("mockSessionStatus");
    
    if (mockStatus === "authenticated") {
      // 2. Load the mock user data and set status in one block
      const mockData: MockSession = {
        user: { name: "Mock User", email: "mock@example.com" },
        organization_id: "205e3e76-5005-44bf-9e62-4d7c954775a7",
        tenant_id: "614d4a59-100a-4c66-87b3-123fa7a2116e",
      };
      
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(mockData);
      setStatus("authenticated");
      
    } else {
      // If not authenticated, still set status, but no need to call setData(null) 
      // since it's already null from the initial state.
      setStatus("unauthenticated");
    }
  }, []); // Empty dependency array means this runs only once after the initial render

  return { data, status };
}
// --- END: MOCK SESSION DEFINITIONS ---


function MainApp({ session }: { session: MockSession }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("insights");
  
  // Use the real session data for tabs
  const testSession = {
    organization_id: session?.organization_id ?? "205e3e76-5005-44bf-9e62-4d7c954775a7",
    tenant_id: session?.tenant_id ?? "614d4a59-100a-4c66-87b3-123fa7a2116e",
  };

  const tabs = [
    { id: "insights", label: "View Insights", icon: <BarChart2 className="w-4 h-4" /> },
    { id: "data", label: "View Data", icon: <Table className="w-4 h-4" /> },
    { id: "upload", label: "Upload Files", icon: <Upload className="w-4 h-4" /> },
  ];

  return (
    <div className="flex h-screen w-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`flex flex-col bg-white border-r transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b">
          {!collapsed && <h2 className="font-semibold text-lg">Lyons Magnus</h2>}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto"
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>
        </div>

        <nav className="flex-1 mt-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {!collapsed && tab.label}
            </Button>
          ))}
        </nav>

        <div className={`p-3 border-t ${collapsed ? "flex justify-center" : ""}`}>
          <Button
            className={`${
              collapsed ? "w-10 h-10 p-0" : "w-full flex items-center justify-center gap-2"
            }`}
            variant="outline"
          >
            <Upload className="w-5 h-5" />
            {!collapsed && <span>Re-run Pending Files</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Card className="w-full h-full flex items-center justify-center text-gray-500 text-lg overflow-scroll overflow-x-scroll">
          
          {/* --- RESTORED TAB COMPONENTS --- */}
          {activeTab === "insights" && <InsightsTab organization_id={testSession.organization_id}/>}
          {activeTab === "data" && <DataTab organization_id={testSession.organization_id}/>}
          {activeTab === "upload" && <FileUpload organization_id={testSession.organization_id} tenant_id={testSession.tenant_id}/>}
          {/* --- END RESTORED TAB COMPONENTS --- */}
          
        </Card>
      </div>
    </div>
  );
}

export default function Home() {
  // const { data: session, status } = useSession(); // keep all the commeted parts they are important
  const {data : session , status} = useMockSession() // defined use mock session

  if (status === "loading") {
    return (
      <main className="flex items-center justify-center h-screen bg-gray-100">
        <div>Loading...</div>
      </main>
    );
  }

  if (status === "authenticated") {
    return (
      <main className="bg-gray-100 w-screen h-screen">
        <MainApp session={session} />
      </main>
    );
  }
  
  // if status is "unauthenticated"
  return (
    <main className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-semibold mb-3">Access Denied</h1>
      <p className="mb-4 text-gray-700">You must be signed in to view this application.</p>
      {/* We use window.location to simulate the redirect to the mock login page */}
      <Button onClick={() => window.location.href = "/login"}>Go to Login Screen</Button>
    </main>
  );
}
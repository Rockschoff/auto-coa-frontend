'use client';

import { Session } from "next-auth";
import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Menu, ChevronLeft, ChevronRight, BarChart2, Table, Upload } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import DataTab from "@/components/DataTab";

function MainApp({ session }: { session: Session | null }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("insights");
  const testSession = {
    organization_id : "205e3e76-5005-44bf-9e62-4d7c954775a7",
    tenant_id : "614d4a59-100a-4c66-87b3-123fa7a2116e"
  }

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
          {!collapsed && <h2 className="font-semibold text-lg">Dashboard</h2>}
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
          {activeTab === "insights" && <div>Insights Placeholder</div>}
          {activeTab === "data" && <DataTab organization_id={testSession.organization_id}/>}
          {activeTab === "upload" && <FileUpload organization_id={testSession.organization_id} tenant_id={testSession.tenant_id}/>}
        </Card>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <main className="flex items-center justify-center h-screen bg-gray-100">
        <div>Loading...</div>
      </main>
    );
  }

  if (/*status === "authenticated"*/true) {
    return (
      <main className="bg-gray-100 w-screen h-screen">
        <MainApp session={session} />
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-amber-100">
      <h1 className="text-2xl font-semibold mb-3">Access Denied</h1>
      <p className="mb-4 text-gray-700">You must be signed in to view this application.</p>
      <Button onClick={() => signIn("microsoft-entra-id")}>Login via Microsoft</Button>
    </main>
  );
}

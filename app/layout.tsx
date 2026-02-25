import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { TaskProvider } from "@/components/task-provider";
import { SprintProvider } from "@/components/sprint-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth-provider";
import { ContactProvider } from "@/components/contact-provider";
import { OrganisationProvider } from "@/components/organisation-provider";
import { ProjectProvider } from "@/components/project-provider";
import { AreaProvider } from "@/components/area-provider";
import { NoteProvider } from "@/components/note-provider";
import { CommandPalette } from "@/components/command-palette";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ops Dashboard",
  description: "Unified operations dashboard for Byron Film & KORUS Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0F0F0F]`}>
        <AuthProvider>
          <WorkspaceProvider>
            <TaskProvider>
              <ProjectProvider>
              <AreaProvider>
              <ContactProvider>
              <OrganisationProvider>
              <SprintProvider>
              <NoteProvider>
                <TooltipProvider>
                  <div className="flex h-screen overflow-hidden">
                    <Sidebar />
                    <main className="flex-1 ml-[280px] overflow-y-auto">
                      {children}
                    </main>
                    <CommandPalette />
                  </div>
                </TooltipProvider>
              </NoteProvider>
              </SprintProvider>
              </OrganisationProvider>
              </ContactProvider>
              </AreaProvider>
              </ProjectProvider>
            </TaskProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

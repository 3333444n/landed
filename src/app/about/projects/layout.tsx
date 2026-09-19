import { FolderKanban } from "lucide-react";
import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { CardList } from "@/components/Card";
import { Column, EmptyState } from "@/components/Column";
import { AddLink, Toolbar } from "@/components/Toolbar";
import { listEmployment, listProjects } from "@/modules/profile";

import { ProjectCard } from "../RecordCards";

export const dynamic = "force-dynamic";

export default async function ProjectsLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const [projects, roles] = await Promise.all([
    listProjects(deps(), profile.id),
    listEmployment(deps(), profile.id),
  ]);

  return (
    <>
      <Column
        icon={<FolderKanban />}
        title="Projects"
        count={projects.length}
        subtitle="Distinct bodies of work, inside a role or on your own."
        parentHref="/about"
        parentTitle="About me"
        toolbar={<Toolbar right={<AddLink href="/about/projects/new" label="Add project" />} />}
      >
        {projects.length === 0 ? (
          <EmptyState>No projects yet. Add the first one with the plus.</EmptyState>
        ) : (
          <CardList label="Projects">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard record={project} roles={roles} />
              </li>
            ))}
          </CardList>
        )}
      </Column>
      {children}
    </>
  );
}

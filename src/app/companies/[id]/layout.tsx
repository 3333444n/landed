import { LogoPicker } from "@/components/LogoPicker";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { getCompany, listCompanyFindings, findingKindLabel, logoHref } from "@/modules/companies";
import { Column } from "@/components/Column";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Toolbar, AddLink } from "@/components/Toolbar";
import { CompanyForm, companyFormId } from "../CompanyForm";
import { saveCompanyAction, deleteCompanyAction } from "../actions";
import styles from "../companies.module.css";
export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const company = await getCompany(deps(), profile.id, id);
  if (!company) notFound();
  const findings = await listCompanyFindings(deps(), profile.id, id);
  return (
    <>
      <Column
        title={company.name}
        control={
          <LogoPicker
            key={company.updatedAt.toISOString()}
            formId={companyFormId}
            current={logoHref(company)}
          />
        }
        parentHref="/companies"
        parentTitle="Companies"
        width="detail"
      >
        <CompanyForm
          key={company.updatedAt.toISOString()}
          action={saveCompanyAction.bind(null, id)}
          record={{
            id,
            name: company.name,
            location: company.location ?? "",
            website: company.website ?? "",
            about: company.about ?? "",
            expectedUpdatedAt: company.updatedAt.toISOString(),
          }}
        />
        <section aria-label="Findings">
          <h3 className="title-md">Findings</h3>
          <Toolbar right={<AddLink href={`/companies/${id}/findings/new`} label="Add finding" />} />
          {findings.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Finding</th>
                    <th>Source</th>
                    <th>Retrieved</th>
                    <th>Kind</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <Link href={`/companies/${id}/findings/${f.id}`}>{f.text}</Link>
                      </td>
                      <td>
                        <a href={f.sourceUrl} target="_blank" rel="noreferrer">
                          {new URL(f.sourceUrl).hostname}
                        </a>
                      </td>
                      <td>{f.retrievedAt}</td>
                      <td>{findingKindLabel(f.kind)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-secondary">Add sourced observations to help tailor cover letters.</p>
          )}
        </section>
        <ConfirmDelete
          action={deleteCompanyAction.bind(null, id, company.updatedAt.toISOString())}
          what="company"
        />
      </Column>
      {children}
    </>
  );
}

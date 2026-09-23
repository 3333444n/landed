import {expect, type Page} from "@playwright/test";
export async function createJobCompany(page: Page, name: string) {
 await page.getByRole("button",{name:"Add a company",exact:true}).click();
 await page.getByLabel("New company name",{exact:true}).fill(name);
 await page.getByRole("button",{name:"Create company",exact:true}).click();
 await expect(page.getByRole("combobox",{name:"Company",exact:true})).toHaveValue(name);
}

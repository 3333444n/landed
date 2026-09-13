import type { FieldErrors, FormValues } from "@/app/form-state";
import { Field } from "./Field";
import styles from "./MonthDateFields.module.css";

/** Month-precision start and end dates, as year and month inputs (docs/04). */
export function MonthDateFields({
  values,
  errors,
  endLabel = "End",
}: {
  values: FormValues;
  errors: FieldErrors;
  endLabel?: string;
}) {
  return (
    <div className={styles.group}>
      <div className={styles.pair}>
        <Field
          label="Start year"
          name="startYear"
          inputMode="numeric"
          placeholder="2023"
          defaultValue={values.startYear}
          errors={errors.startYear}
        />
        <Field
          label="Month"
          name="startMonth"
          inputMode="numeric"
          placeholder="1 to 12"
          defaultValue={values.startMonth}
          errors={errors.startMonth}
        />
      </div>
      <div className={styles.pair}>
        <Field
          label={`${endLabel} year`}
          name="endYear"
          inputMode="numeric"
          placeholder="2025"
          defaultValue={values.endYear}
          errors={errors.endYear}
        />
        <Field
          label="Month"
          name="endMonth"
          inputMode="numeric"
          placeholder="1 to 12"
          defaultValue={values.endMonth}
          errors={errors.endMonth}
        />
      </div>
    </div>
  );
}

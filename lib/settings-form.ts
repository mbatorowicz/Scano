/** Stan formularza ustawień. Poza plikiem `use server`, bo tam eksportować można tylko funkcje. */

export type SettingsFormState = {
  status: "idle" | "saved" | "error";
  message: string | null;
};

export const INITIAL_SETTINGS_FORM_STATE: SettingsFormState = {
  status: "idle",
  message: null,
};

export const FEE_RATE_FIELD = "feeRate";

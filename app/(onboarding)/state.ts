export type OnboardingState = {
  errors: Record<string, string>;
  message: string | null;
};

export const initialOnboardingState: OnboardingState = {
  errors: {},
  message: null,
};

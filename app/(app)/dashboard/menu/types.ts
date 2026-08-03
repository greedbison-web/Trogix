export type ActionResult = {
  ok: boolean;
  errors: Record<string, string>;
  message: string | null;
};

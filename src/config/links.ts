/**
 * Every outbound link in one place, so the About screen and the store listing
 * can be checked against each other. Nothing here is fetched by the app —
 * these open in the system browser only when the user taps them.
 */
export const links = {
  /** The source citation Google Play asks for: a link users can verify. */
  sourceQuestionBank: 'https://www.aptransport.org/html/llr-question-bank.html',
  /** Hosted on GitHub Pages at M7. Until then the policy is the repo doc. */
  privacyPolicy: 'https://github.com/komalsivvala/app1/blob/main/docs/privacy-policy.md',
  /** The "report a wrong answer" mailto. null hides the row. Set at M7 with an
   *  address the owner is happy to publish — never an address guessed here. */
  supportEmail: null as string | null,
} as const;

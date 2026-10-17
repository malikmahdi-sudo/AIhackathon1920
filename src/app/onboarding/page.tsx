import { Masthead } from "@/components/masthead";
import { OnboardingForm } from "@/components/onboarding-form";
import { currentPreferences } from "@/lib/preference-store";

export const runtime = "nodejs";

export default async function OnboardingPage() {
  const preferences = await currentPreferences();
  return (
    <div className="paper-shell">
      <Masthead />
      <main id="main-content" className="onboarding">
        <p className="eyebrow">Your paper starts with you</p>
        <h1>{preferences ? "Refine your morning." : "What sparks your curiosity?"}</h1>
        <p className="intro">A few small choices for a more thoughtful morning. You can change these anytime.</p>
        <OnboardingForm initial={preferences} />
      </main>
    </div>
  );
}

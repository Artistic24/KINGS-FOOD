import { useEffect, useState } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

const STEPS = [
  { title: "Enter your full name", body: "Use the exact name the rider should ask for at the door." },
  { title: "Reachable phone number", body: "Format: +237 6XX XX XX XX. The rider will call this number — keep it on you." },
  { title: "Pick the correct region", body: "Delivery fees and rider routes depend on it. Wrong region = wrong fee and possible cancellation." },
  { title: "Clear address & landmark", body: "Type your city/quarter and a clear landmark (e.g. \"opposite Total filling station\"). Avoid \"near my house\"." },
  { title: "Allow location access", body: "When your browser asks, tap Allow. This lets us auto-place your delivery pin accurately." },
  { title: "Drop the delivery pin", body: "Tap or drag the marker on the map to the exact drop-off spot. This is the most important step." },
  { title: "Choose payment", body: "Cash on Delivery, MTN MoMo or Orange Money. For mobile money, use your order number as the reference." },
  { title: "Review your order", body: "Check items, quantities and total on the right. Nothing can be changed after you place the order." },
  { title: "Place the order", body: "Tap Place order and save your order number. Track live status on the order page." },
];

const STORAGE_KEY = "checkout-tutorial-dismissed";

export function CheckoutTutorial() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setStep(0); setOpen(true); }}
        className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
        aria-label="Show checkout tutorial"
      >
        ?
      </button>
    );
  }

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={dismiss}>
      <div
        className="w-full max-w-md rounded-2xl border-2 border-saffron/40 bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-saffron text-saffron-foreground">📋</span>
            <div>
              <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
              <h3 className="font-display text-base font-bold">{s.title}</h3>
            </div>
          </div>
          <button type="button" onClick={dismiss} aria-label="Close" className="rounded-full p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{s.body}</p>

        <div className="mt-4 flex h-1.5 gap-1">
          {STEPS.map((_, i) => (
            <span key={i} className={`flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button type="button" onClick={dismiss} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 rounded-full border border-input bg-background px-4 py-2 text-sm font-semibold hover:bg-muted">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? dismiss() : setStep(step + 1))}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {isLast ? "Got it" : "Next"} {!isLast && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

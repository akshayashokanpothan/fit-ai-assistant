"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Crown, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useSubscription } from "@/providers/subscription-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SubscriptionSuccessModal } from "@/components/subscription-success-modal";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "/month",
    description: "For casual starters",
    features: [
      "3 meal scans per day",
      "20 AI chat messages per day",
      "3 workout generations per week",
      "Basic health insights"
    ]
  },
  {
    name: "Pro",
    price: "₹299",
    period: "/month",
    description: "For consistent fitness seekers",
    isPopular: true,
    features: [
      "15 meal scans per day",
      "100 AI chat messages per day",
      "Unlimited workout generations",
      "Priority AI processing"
    ]
  },
  {
    name: "Pro+",
    price: "₹599",
    period: "/month",
    description: "For serious athletes",
    features: [
      "30 meal scans per day",
      "250 AI chat messages per day",
      "Unlimited workout generations",
      "Highest priority AI processing"
    ]
  }
];

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { plan: currentPlan, loading, refreshPlan } = useSubscription();
  const [checkoutProcessing, setCheckoutProcessing] = useState<string | null>(null);
  const [verificationTransition, setVerificationTransition] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const currentPlanName = currentPlan?.name || "Free";

  const getButtonText = (planName: string) => {
    if (checkoutProcessing === planName) return "Processing...";
    if (currentPlanName === "Free") {
      return planName === "Free" ? "Current Plan" : "Upgrade";
    }
    if (currentPlanName === "Pro") {
      if (planName === "Free") return "Switch to Free";
      if (planName === "Pro") return "Current Plan";
      if (planName === "Pro+") return "Upgrade";
    }
    if (currentPlanName === "Pro+") {
      if (planName === "Free") return "Switch to Free";
      if (planName === "Pro") return "Switch to Pro";
      if (planName === "Pro+") return "Current Plan";
    }
    return "Upgrade";
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (planName: string) => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (planName === "Free") {
      setErrorToast("To switch to Free, please cancel your subscription in profile settings.");
      return;
    }
    if (planName === "Pro" && currentPlanName === "Pro+") {
      setErrorToast("To switch to Pro, please cancel your Pro+ plan first.");
      return;
    }

    setCheckoutProcessing(planName);
    setErrorToast(null);

    const res = await loadRazorpay();
    if (!res) {
      setErrorToast("Failed to load Razorpay SDK. Please check your internet connection.");
      setCheckoutProcessing(null);
      return;
    }

    try {
      const response = await fetch("/api/payment/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create subscription");
      }

      const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

      const options = {
        key: publicKey,
        subscription_id: data.subscriptionId,
        name: "Pace AI",
        description: `${planName} Subscription`,
        handler: async function (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) {
          setVerificationTransition(true);
          try {
            const verifyRes = await fetch("/api/payment/verify-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                planName: planName
              })
            });

            if (!verifyRes.ok) throw new Error("Verification failed");

            sessionStorage.setItem("pace_subscription_upgrade", planName);
            await refreshPlan();
            setShowSuccessModal(true);
          } catch (e) {
            console.error("Verification error:", e);
            setErrorToast("Payment completed but verification delayed. Your plan will update shortly via webhook.");
          } finally {
            setVerificationTransition(false);
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: "#114220",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: { error: { description: string } }) {
        setErrorToast(response.error.description);
      });
      rzp.open();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorToast(error.message);
      } else {
        setErrorToast("An unknown error occurred.");
      }
    } finally {
      setCheckoutProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper pb-20">
      <SubscriptionSuccessModal 
        isOpen={showSuccessModal} 
        onClose={() => setShowSuccessModal(false)} 
      />

      {/* Header */}
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-surface/80 px-4 backdrop-blur-xl">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-black/[0.04]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="font-medium text-ink">Upgrade Plan</span>
        <div className="w-9" />
      </div>

      <div className="px-5 pt-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-[32px] font-bold text-ink tracking-tight leading-tight">
            Level up your fitness journey
          </h1>
          <p className="mt-3 text-[14px] text-ink-soft">
            Choose a plan that fits your goals and let Pace AI handle the rest.
          </p>
        </div>

        {errorToast && (
          <div className="mb-6 rounded-[16px] bg-red-50 border border-red-100 p-4 flex gap-3 items-start animate-in fade-in">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-[14px] text-red-900 leading-relaxed">{errorToast}</p>
          </div>
        )}

        <div className="space-y-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlanName === plan.name;

            return (
              <div
                key={plan.name}
                className={cn(
                  "relative rounded-[24px] border p-6 overflow-hidden transition-all",
                  isCurrent 
                    ? "bg-[#f1f6f3]/30 border-[#335f42] shadow-sm" 
                    : plan.isPopular
                      ? "bg-surface border-primary shadow-sm"
                      : "bg-surface border-line"
                )}
              >
                {plan.isPopular && !isCurrent && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
                )}
                {isCurrent && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-[#335f42]" />
                )}
                
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {!isCurrent && plan.isPopular && <Crown className="w-5 h-5 text-primary" />}
                    <h2 className="text-[18px] font-bold text-ink">
                      {plan.name} {plan.isPopular && "⭐"}
                    </h2>
                  </div>
                  {isCurrent && (
                    <span className="bg-[#335f42]/10 text-[#335f42] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </div>
                
                <p className="text-[13px] text-ink-soft mb-4">{plan.description}</p>
                
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-[32px] font-display font-bold text-ink">{plan.price}</span>
                  <span className="text-[14px] text-ink-soft">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={cn("w-4 h-4 shrink-0 mt-0.5", isCurrent ? "text-[#335f42]" : "text-primary")} />
                      <span className="text-[13px] text-ink">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn(
                    "w-full h-12 rounded-[16px] font-bold text-[15px]",
                    isCurrent 
                      ? "bg-[#335f42]/10 text-[#335f42] hover:bg-[#335f42]/20 cursor-default" 
                      : plan.isPopular
                        ? "bg-primary text-white hover:bg-primary/90"
                        : "bg-ink text-surface hover:bg-ink/90"
                  )}
                  variant={isCurrent ? "outline" : "primary"}
                  disabled={isCurrent || checkoutProcessing !== null || verificationTransition}
                  onClick={() => !isCurrent && handleUpgrade(plan.name)}
                >
                  {getButtonText(plan.name)}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {verificationTransition && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper/90 backdrop-blur-sm animate-in fade-in">
          <Loader2 className="h-10 w-10 animate-spin text-[#335f42] mb-4" />
          <p className="text-[16px] font-medium text-ink">Updating your Pace AI experience...</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getUserPlanAction } from "@/app/actions/getUserPlan";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Define razorpay window type
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
  const [currentPlanName, setCurrentPlanName] = useState<string>("Free");
  const [loading, setLoading] = useState(true);
  const [checkoutProcessing, setCheckoutProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      getUserPlanAction(user.id).then((plan) => {
        if (plan) setCurrentPlanName(plan.name);
        setLoading(false);
      });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
    }
  }, [user]);

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
    setCheckoutProcessing(planName);

    const res = await loadRazorpay();
    if (!res) {
      alert("Failed to load Razorpay SDK. Please check your internet connection.");
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

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use public key here
        subscription_id: data.subscriptionId,
        name: "Pace AI",
        description: `${planName} Subscription`,
        handler: function () {
          // Success callback
          // We rely on the webhook to actually activate the plan, but we can show a success message here
          alert("Payment successful! Your plan will be updated momentarily.");
          // Optionally refetch user plan
          getUserPlanAction(user.id).then((plan) => {
            if (plan) setCurrentPlanName(plan.name);
          });
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
        alert(response.error.description);
      });
      rzp.open();
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("An unknown error occurred.");
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

        <div className="space-y-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlanName === plan.name;

            return (
              <div
                key={plan.name}
                className={cn(
                  "relative rounded-[24px] border p-6 overflow-hidden transition-all",
                  plan.isPopular
                    ? "bg-surface border-primary shadow-sm"
                    : "bg-surface border-line"
                )}
              >
                {plan.isPopular && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
                )}
                
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {plan.isPopular && <Crown className="w-5 h-5 text-primary" />}
                    <h2 className="text-[18px] font-bold text-ink">
                      {plan.name} {plan.isPopular && "⭐"}
                    </h2>
                  </div>
                  {isCurrent && (
                    <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
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
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-[13px] text-ink">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn(
                    "w-full h-12 rounded-[16px] font-bold text-[15px]",
                    isCurrent 
                      ? "bg-line text-ink-soft hover:bg-line cursor-default" 
                      : plan.isPopular
                        ? "bg-primary text-white hover:bg-primary/90"
                        : "bg-ink text-surface hover:bg-ink/90"
                  )}
                  variant={isCurrent ? "outline" : "primary"}
                  disabled={isCurrent || checkoutProcessing !== null}
                  onClick={() => !isCurrent && handleUpgrade(plan.name)}
                >
                  {isCurrent ? "Current Plan" : (checkoutProcessing === plan.name ? "Processing..." : "Upgrade")}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

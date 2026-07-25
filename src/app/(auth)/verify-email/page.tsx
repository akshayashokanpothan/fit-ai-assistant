"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
        <MailCheck className="h-6 w-6 text-primary" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-medium text-ink">Check your email</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        We&apos;ve sent a verification link
        {email ? (
          <>
            {" "}
            to <span className="font-medium text-ink">{email}</span>
          </>
        ) : null}
        . Open it to confirm your address, then come back and sign in.
      </p>
      <p className="mt-6 text-sm text-ink-soft">
        <Link href="/login" className="font-medium text-primary">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../lib/api-client.js";

export function HomeSessionActions({ locale, labels }) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient.me().then(() => active && setSignedIn(true)).catch(() => {});
    return () => { active = false; };
  }, []);

  if (signedIn) {
    return <Link className="primary-button" href={`/${locale}/account`}>{labels.openWorkspace}</Link>;
  }

  return (
    <>
      <Link className="primary-button" href={`/${locale}/register`}>{labels.register}</Link>
      <Link className="secondary-button" href={`/${locale}/login`}>{labels.signIn}</Link>
    </>
  );
}

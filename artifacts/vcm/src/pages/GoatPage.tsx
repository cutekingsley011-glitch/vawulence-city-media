import { useEffect } from "react";
import { useLocation } from "wouter";

export default function GoatPage() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/vote-cards"); }, [setLocation]);
  return null;
}

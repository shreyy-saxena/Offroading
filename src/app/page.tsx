import { ReportFlow } from "@/components/report-flow/ReportFlow";

// The hero screen (PRD FR11): opening the app *is* starting a report,
// with no landing menu in between.
export default function Home() {
  return <ReportFlow />;
}

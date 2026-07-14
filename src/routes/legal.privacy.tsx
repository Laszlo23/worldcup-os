import { createFileRoute } from "@tanstack/react-router";
import { privacyPolicy } from "@/content/legal";
import { LegalDocumentPage } from "@/components/site/legal-document-page";

export const Route = createFileRoute("/legal/privacy")({
  component: () => <LegalDocumentPage doc={privacyPolicy} />,
});

import { createFileRoute } from "@tanstack/react-router";
import { termsOfService } from "@shared/content/legal";
import { LegalDocumentPage } from "@/components/site/legal-document-page";

export const Route = createFileRoute("/legal/terms")({
  component: () => <LegalDocumentPage doc={termsOfService} />,
});

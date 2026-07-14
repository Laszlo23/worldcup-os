import { termsOfService } from "@/content/legal";
import { LegalDocumentPage } from "@/components/site/legal-document-page";

export default function TermsPage() {
  return <LegalDocumentPage doc={termsOfService} />;
}

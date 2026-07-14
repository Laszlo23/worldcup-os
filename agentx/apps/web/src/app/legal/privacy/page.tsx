import { privacyPolicy } from "@/content/legal";
import { LegalDocumentPage } from "@/components/site/legal-document-page";

export default function PrivacyPage() {
  return <LegalDocumentPage doc={privacyPolicy} />;
}

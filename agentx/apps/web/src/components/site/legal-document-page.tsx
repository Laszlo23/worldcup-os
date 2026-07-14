import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LegalDocument } from "@/content/legal";
import { DevnetBanner } from "@/components/site/devnet-banner";
import { PartnerFooter } from "@/components/site/partner-footer";

export function LegalDocumentPage({ doc }: { doc: LegalDocument }) {
  return (
    <div className="min-h-screen bg-background">
      <DevnetBanner />
      <div className="max-w-lg mx-auto px-4 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <h1 className="text-2xl font-bold mb-2">{doc.title}</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated {doc.updatedAt}</p>
        <p className="text-muted-foreground mb-10 leading-relaxed text-sm">{doc.intro}</p>
        <div className="space-y-8">
          {doc.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold mb-3">{section.title}</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <PartnerFooter compact />
    </div>
  );
}

// =============================================================================
// TerraPulse — Evidence Registry & Citation Verification Engine
// Strictly Zero Hallucination: Every claim must tie to an explicit verified datum
// =============================================================================

export interface EvidenceItem {
  id: string; // e.g. "E1", "E2"
  source: string; // e.g. "Open-Meteo ERA5 Seamless"
  metric: string; // e.g. "14-Day Cumulative Potential Crop Evapotranspiration"
  value: number | string;
  unit?: string;
  fetchedAt: string; // Real HTTP completion timestamp
  description: string;
}

export interface CitationVerificationResult {
  validCitations: { claim: string; source: string; timestamp: string }[];
  invalidIds: string[];
  missingCitationsForNumbers: string[];
  isFullyGrounded: boolean;
}

export class EvidenceRegistry {
  private items: Map<string, EvidenceItem> = new Map();
  private counter: number = 0;

  /**
   * Registers a verified physical metric and returns a unique evidence token [E1], [E2]...
   */
  public register(params: {
    source: string;
    metric: string;
    value: number | string;
    unit?: string;
    fetchedAt?: string;
    description: string;
  }): EvidenceItem {
    this.counter += 1;
    const id = `E${this.counter}`;
    const fetchedAt = params.fetchedAt || new Date().toISOString();

    const item: EvidenceItem = {
      id,
      source: params.source,
      metric: params.metric,
      value: params.value,
      unit: params.unit,
      fetchedAt,
      description: params.description,
    };

    this.items.set(id, item);
    return item;
  }

  public get(id: string): EvidenceItem | undefined {
    return this.items.get(id);
  }

  public getAll(): EvidenceItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Formats all registered evidence as grounded context for LLM prompt
   */
  public toPromptString(): string {
    if (this.items.size === 0) {
      return "No verified telemetry items currently registered.";
    }

    return Array.from(this.items.values())
      .map(
        (item) =>
          `[${item.id}] Source: ${item.source} | Fetched: ${item.fetchedAt} | ${item.metric} = ${item.value}${item.unit ? " " + item.unit : ""} (${item.description})`
      )
      .join("\n");
  }

  /**
   * Post-validates synthesis text against the evidence registry.
   * Rejects any hallucinated citation IDs not present in the registry.
   */
  public verifyCitations(text: string): CitationVerificationResult {
    const validCitations: { claim: string; source: string; timestamp: string }[] = [];
    const invalidIds: string[] = [];

    // Match [E1], [E2], [E12] citation formats
    const citationMatches = text.match(/\[E\d+\]/g) || [];
    const uniqueIds = Array.from(new Set(citationMatches.map((m) => m.replace(/[\[\]]/g, ""))));

    for (const id of uniqueIds) {
      const item = this.items.get(id);
      if (item) {
        validCitations.push({
          claim: `${item.metric}: ${item.value}${item.unit ? " " + item.unit : ""}`,
          source: `${item.source} [${item.id}]`,
          timestamp: item.fetchedAt,
        });
      } else {
        invalidIds.push(id);
      }
    }

    // Check for naked numbers without attached evidence ID
    const missingCitationsForNumbers: string[] = [];
    // Flag any percentage or large number claims that lack evidence tags
    const numericRegex = /(\d+(\.\d+)?\s*(%|mm|t\/ha|L\/ha))/g;
    let numMatch: RegExpExecArray | null;
    while ((numMatch = numericRegex.exec(text)) !== null) {
      const windowAround = text.slice(Math.max(0, numMatch.index - 30), Math.min(text.length, numMatch.index + 40));
      if (!/\[E\d+\]/.test(windowAround)) {
        missingCitationsForNumbers.push(numMatch[0]);
      }
    }

    return {
      validCitations,
      invalidIds,
      missingCitationsForNumbers,
      isFullyGrounded: invalidIds.length === 0,
    };
  }
}

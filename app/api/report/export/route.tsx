import { NextRequest, NextResponse } from "next/server";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream,
} from "@react-pdf/renderer";
import type { AgentReport } from "@/types";



const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    color: "#2E2E2E",
    fontSize: 10,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: "#889C73",
    borderBottomStyle: "solid",
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4F5E43",
  },
  subtitle: {
    fontSize: 11,
    color: "#5E5E5E",
    marginTop: 4,
  },
  badge: {
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    _br: 4,
    backgroundColor: "#F5D9C2",
    color: "#963E00",
    alignSelf: "flex-start",
    fontSize: 9,
    fontWeight: "bold",
  },
  section: {
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1F1F1F",
    borderBottomWidth: 1,
    borderBottomColor: "#E6E6E6",
    borderBottomStyle: "solid",
    paddingBottom: 4,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    color: "#808080",
  },
  value: {
    fontWeight: "bold",
    color: "#1F1F1F",
  },
  box: {
    padding: 10,
    _br: 6,
    backgroundColor: "#F4F4F4",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderStyle: "solid",
    marginBottom: 8,
  },
  alertBox: {
    padding: 10,
    _br: 6,
    backgroundColor: "#E1E8DA",
    borderWidth: 1,
    borderColor: "#CDD8C2",
    borderStyle: "solid",
    marginBottom: 8,
  },
  recItem: {
    marginBottom: 4,
    paddingLeft: 6,
  },
  citationText: {
    fontSize: 8,
    color: "#A7A7A7",
    marginTop: 2,
  },
  footer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#C4C4C4",
    borderTopStyle: "solid",
    paddingTop: 8,
    fontSize: 8,
    color: "#A7A7A7",
    textAlign: "center",
  },
});

function TerraPulsePdfReport({ report }: { report: AgentReport }) {
  const dateStr = new Date(report.generatedAt).toLocaleDateString("en-IN", {
    dateStyle: "full",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>TERRAPULSE EMERGENCY AGRICULTURAL ADVISORY</Text>
          <Text style={styles.subtitle}>
            Micro-Climate Risk, FAO Yield Reduction & Mitigation Directive | {dateStr}
          </Text>
          <Text style={styles.badge}>
            CLASSIFICATION: {report.riskClassification.toUpperCase()} ({report.riskLevel.toUpperCase()})
          </Text>
        </View>

        {/* Location & Crop */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Target Farm Identification & Telemetry Scope</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Location / Region:</Text>
            <Text style={styles.value}>
              {report.location.name}, {report.location.state} ({report.location.lat.toFixed(4)}°N, {report.location.lon.toFixed(4)}°E)
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Target Crop / Ky Factor:</Text>
            <Text style={styles.value}>
              {report.location.crop} (Crop Water Sensitivity Factor Ky: {report.yieldOutput.ky})
            </Text>
          </View>
        </View>

        {/* Yield Math */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Deterministic FAO-33 Crop Water Production Math</Text>
          <View style={styles.box}>
            <View style={styles.row}>
              <Text style={styles.label}>Predicted Yield Reduction:</Text>
              <Text style={styles.value}>{report.yieldOutput.yieldReductionPct.toFixed(1)}%</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Estimated Realized Yield:</Text>
              <Text style={styles.value}>
                {report.yieldOutput.estimatedYield_t_ha.toFixed(2)} t/ha (Potential Max: {report.yieldOutput.maxYield_t_ha} t/ha)
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Soil Moisture Deficit Index (SMDI):</Text>
              <Text style={styles.value}>{report.yieldOutput.smdi.toFixed(3)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Deficit Irrigation Needed to Restore FC:</Text>
              <Text style={styles.value}>
                {report.yieldOutput.irrigationDeficit_L_ha.toLocaleString()} Liters / Hectare
              </Text>
            </View>
          </View>
        </View>

        {/* Soil Profile & Monsoon */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Satellite Soil Telemetry & Climate Baseline</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Soil Hydraulic Limits (ISRIC SoilGrids):</Text>
            <Text style={styles.value}>
              FC: {report.soilProfile.fieldCapacity.toFixed(3)} m³/m³ | WP: {report.soilProfile.wiltingPoint.toFixed(3)} m³/m³ | Clay: {report.soilProfile.clay_pct.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Indian Monsoon Long Period Average (LPA):</Text>
            <Text style={styles.value}>
              {report.monsoonData.lpa_mm.toFixed(1)} mm (Deviation: {report.monsoonData.lpa_deviation_pct > 0 ? "+" : ""}{report.monsoonData.lpa_deviation_pct.toFixed(1)}%)
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Standardized Precip-ET Index (SPEI):</Text>
            <Text style={styles.value}>{report.monsoonData.spei.toFixed(2)}</Text>
          </View>
        </View>

        {/* Actionable Mitigation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Actionable Agronomic Mitigation Plan</Text>
          <View style={styles.alertBox}>
            {report.mitigation.recommendations.map((rec, i) => (
              <Text key={i} style={styles.recItem}>
                • {rec}
              </Text>
            ))}
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Harvest Timing Directive:</Text>
          </View>
          <Text style={{ fontSize: 9, color: "#434343", marginBottom: 6 }}>
            {report.mitigation.harvestAdvice}
          </Text>
          <View style={styles.row}>
            <Text style={styles.label}>Mandi Price Optimization:</Text>
          </View>
          <Text style={{ fontSize: 9, color: "#434343" }}>
            {report.mitigation.mandiRouting}
          </Text>
        </View>

        {/* Citations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Verified Data Stream Provenance & Citations</Text>
          {report.citations.map((cite, i) => (
            <Text key={i} style={styles.citationText}>
              [{i + 1}] {cite.claim} — Source: {cite.source} (Timestamp: {cite.timestamp})
            </Text>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          TerraPulse Intelligence Engine | Zero Dummy Data Policy Compliant | Ingested via Copernicus Sentinel-2, Open-Meteo ERA5, NASA POWER, ISRIC SoilGrids, and Agmarknet.
        </Text>
      </Page>
    </Document>
  );
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "pdf";
    const report: AgentReport = await req.json();

    const dateSlug = new Date().toISOString().slice(0, 10);

    if (format === "json") {
      return new NextResponse(JSON.stringify(report, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="terrapulse-advisory-${dateSlug}.json"`,
        },
      });
    }

    // PDF generation via @react-pdf/renderer
    const stream = await renderToStream(<TerraPulsePdfReport report={report} />);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="terrapulse-advisory-${dateSlug}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to generate export report", details: error.message },
      { status: 500 }
    );
  }
}

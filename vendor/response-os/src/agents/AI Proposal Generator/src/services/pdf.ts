import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ProposalData } from "../types/proposal";

const sanitizeFileName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "proposal";

const getAutoTableFinalY = (doc: jsPDF): number => {
  const tableDoc = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
  return tableDoc.lastAutoTable?.finalY ?? 120;
};

const ensureRoom = (doc: jsPDF, y: number, neededHeight: number): number => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + neededHeight > pageHeight - 40) {
    doc.addPage();
    return 50;
  }
  return y;
};

export const downloadProposalPdf = (proposal: ProposalData): void => {
  const locale = proposal.language === "es" ? "es-US" : "en-US";
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
  const labels =
    proposal.language === "es"
      ? {
          subtitle: "Generador IA - Estimacion profesional para cliente",
          generated: "Generado",
          summary: "Resumen del proyecto",
          title: "Titulo",
          projectType: "Tipo de proyecto",
          client: "Cliente",
          address: "Direccion",
          duration: "Duracion estimada",
          validity: "Validez",
          license: "Licencia",
          contact: "Contacto",
          itemized: "Cotizacion detallada",
          subtotal: "Subtotal",
          contingency: "Contingencia",
          tax: "Impuesto",
          total: "Total estimado",
          payment: "Cronograma de pago",
          paymentPercent: "Porcentaje",
          amount: "Monto",
          contract: "Resumen contractual",
          terms: "Terminos y condiciones",
          clientSignature: "Firma del cliente",
          contractorSignature: "Firma del contratista",
          date: "Fecha"
        }
      : {
          subtitle: "AI Proposal Generator - Professional Client Estimate",
          generated: "Generated",
          summary: "Project Summary",
          title: "Title",
          projectType: "Project Type",
          client: "Client",
          address: "Address",
          duration: "Estimated Duration",
          validity: "Validity",
          license: "License",
          contact: "Contact",
          itemized: "Itemized Quote",
          subtotal: "Subtotal",
          contingency: "Contingency",
          tax: "Tax",
          total: "Total Estimate",
          payment: "Payment Schedule",
          paymentPercent: "Percent",
          amount: "Amount",
          contract: "Contract Summary",
          terms: "Terms and Conditions",
          clientSignature: "Client Signature",
          contractorSignature: "Contractor Signature",
          date: "Date"
        };

  const doc = new jsPDF({
    unit: "pt",
    format: "letter"
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(12, 17, 33);
  doc.rect(0, 0, pageWidth, 92, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(proposal.contractor.companyName || "Contractor Proposal", 40, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(labels.subtitle, 40, 58);
  doc.text(
    `${labels.generated} ${new Date(proposal.metadata.generatedAt).toLocaleDateString(locale)}`,
    40,
    75
  );

  doc.setTextColor(28, 31, 41);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(labels.summary, 40, 120);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${labels.title}: ${proposal.metadata.projectTitle}`, 40, 138);
  doc.text(`${labels.projectType}: ${proposal.metadata.projectType}`, 40, 154);
  doc.text(`${labels.client}: ${proposal.client.name || "N/A"}`, 40, 170);
  doc.text(`${labels.address}: ${proposal.client.address || "N/A"}`, 40, 186);
  doc.text(`${labels.duration}: ${proposal.metadata.timelineDays} day(s)`, 340, 138);
  doc.text(`${labels.validity}: ${proposal.metadata.validityDays} day(s)`, 340, 154);
  doc.text(`${labels.license}: ${proposal.contractor.licenseNumber || "N/A"}`, 340, 170);
  doc.text(
    `${labels.contact}: ${proposal.contractor.contactName || "N/A"} | ${proposal.contractor.phone || "N/A"}`,
    340,
    186
  );

  autoTable(doc, {
    startY: 210,
    head: [[labels.itemized, labels.amount]],
    body: [
      ...proposal.quote.items.map((item) => [
        item.description,
        currencyFormatter.format(item.amount)
      ]),
      [labels.subtotal, currencyFormatter.format(proposal.quote.subtotal)],
      [labels.contingency, currencyFormatter.format(proposal.quote.contingencyAmount)],
      [labels.tax, currencyFormatter.format(proposal.quote.taxAmount)],
      [labels.total, currencyFormatter.format(proposal.quote.total)]
    ],
    styles: {
      fontSize: 9,
      cellPadding: 6
    },
    headStyles: {
      fillColor: [46, 102, 255],
      textColor: 255
    },
    columnStyles: {
      1: { halign: "right" }
    }
  });

  autoTable(doc, {
    startY: getAutoTableFinalY(doc) + 14,
    head: [[labels.payment, labels.paymentPercent, labels.amount]],
    body: proposal.paymentSchedule.map((phase) => [
      phase.description,
      `${phase.percentage}%`,
      currencyFormatter.format(phase.amount)
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 6
    },
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: 255
    },
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" }
    }
  });

  let y = getAutoTableFinalY(doc) + 24;
  y = ensureRoom(doc, y, 230);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(labels.contract, 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const contractLines = doc.splitTextToSize(proposal.contract, pageWidth - 80);
  doc.text(contractLines, 40, y + 16);
  y += 16 + contractLines.length * 11;

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(labels.terms, 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  proposal.terms.slice(0, 8).forEach((term) => {
    y += 13;
    const line = doc.splitTextToSize(`- ${term}`, pageWidth - 90);
    doc.text(line, 50, y);
    y += (line.length - 1) * 10;
  });

  y += 24;
  y = ensureRoom(doc, y, 130);

  doc.setDrawColor(80, 90, 120);
  doc.line(60, y, 250, y);
  doc.line(340, y, 530, y);
  doc.setFontSize(9);
  doc.text(labels.clientSignature, 60, y + 14);
  doc.text(labels.contractorSignature, 340, y + 14);

  doc.line(60, y + 54, 250, y + 54);
  doc.line(340, y + 54, 530, y + 54);
  doc.text(labels.date, 60, y + 68);
  doc.text(labels.date, 340, y + 68);

  doc.save(`${sanitizeFileName(proposal.metadata.projectTitle)}-proposal.pdf`);
};

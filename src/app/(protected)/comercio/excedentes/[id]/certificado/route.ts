import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import QRCode from "qrcode";
import crypto from "crypto";
import {
  DONACIONES_TABLE,
  DONATION_CERTIFICATES_TABLE,
  ORGANIZATIONS_TABLE,
  REQUESTS_TABLE,
} from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { parseImageDataUrl } from "@/lib/image-data";
import { getPlanAccess } from "@/lib/plans";
import { getEffectivePlanForProfile } from "@/lib/plan-access";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const formatDate = (value: string | null | undefined, fallback: string) => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatTime = (value: string | null | undefined, fallback: string) => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const wrapText = (
  text: string,
  maxWidth: number,
  measure: (value: string) => number
) => {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (measure(next) <= maxWidth) {
      current = next;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines;
};

type CertificateSnapshot = {
  operation_id?: string | null;
  operation_hash?: string | null;
  collected_at?: string | null;
  donation?: {
    id?: string | null;
    title?: string | null;
    kg?: number | null;
    category?: string | null;
    storage?: string | null;
    expires_at?: string | null;
    pickup_window?: string | null;
    allergens?: string | null;
    notes?: string | null;
    created_at?: string | null;
  };
  commerce?: {
    name?: string | null;
    contact_email?: string | null;
    tax_id?: string | null;
    registry_number?: string | null;
    signature_data_url?: string | null;
    signature_path?: string | null;
    telefono?: string | null;
    whatsapp?: string | null;
    address?: string | null;
    city?: string | null;
    region?: string | null;
    postal_code?: string | null;
  };
  ong?: {
    name?: string | null;
    contact_email?: string | null;
    tax_id?: string | null;
    registry_number?: string | null;
    signature_data_url?: string | null;
    signature_path?: string | null;
    telefono?: string | null;
    whatsapp?: string | null;
    address?: string | null;
    city?: string | null;
    region?: string | null;
    postal_code?: string | null;
  };
};


export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, profile } = await requireApprovedRole("comercio");
  const effectivePlan = getEffectivePlanForProfile(profile);
  const planAccess = getPlanAccess(effectivePlan);
  const cookieStore = await cookies();
  const t = getTranslations(getLocaleFromCookies(cookieStore));

  const getCategoryLabel = (value?: string | null) => {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) {
      return t.pdf.notReported;
    }
    return t.foodTypes[trimmed as keyof typeof t.foodTypes] ?? trimmed;
  };

  const storageLabels = {
    fresco: t.storage.options.fresco,
    refrigerado: t.storage.options.refrigerado,
    congelado: t.storage.options.congelado,
    seco: t.storage.options.seco,
  } as const;

  const getStorageLabel = (value?: string | null) => {
    if (!value) {
      return null;
    }
    return storageLabels[value as keyof typeof storageLabels] ?? value;
  };

  const getDonationStateLabel = (
    storage?: string | null,
    category?: string | null
  ) => {
    if (storage) {
      return getStorageLabel(storage) ?? storage;
    }
    if (category) {
      return getCategoryLabel(category);
    }
    return t.pdf.notReported;
  };

  if (!planAccess.reports) {
    return NextResponse.json(
      { error: t.pdf.errors.planRequired },
      { status: 403 }
    );
  }
  const supabase = await createServerSupabase();

  const { data: donation } = await supabase
    .from(DONACIONES_TABLE)
    .select(
      "id, title, kg, status, created_at, category, storage, expires_at, collected_at"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!donation) {
    return NextResponse.json(
      { error: t.pdf.errors.notFound },
      { status: 404 }
    );
  }

  if (donation.status !== "collected") {
    return NextResponse.json(
      { error: t.pdf.errors.notAvailable },
      { status: 403 }
    );
  }

  const { data: commerce } = await supabase
    .from(ORGANIZATIONS_TABLE)
    .select(
      "name, address, city, region, postal_code, contact_email, tax_id, registry_number, signature_data_url, signature_path"
    )
    .eq("user_id", user.id)
    .single();

  const { data: requests } = await supabase
    .from(REQUESTS_TABLE)
    .select("ong_user_id, created_at")
    .eq("donation_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  const request = requests?.[0] ?? null;

  const { data: ong } = request?.ong_user_id
    ? await supabase
        .from(ORGANIZATIONS_TABLE)
        .select(
          "name, address, city, region, postal_code, contact_email, tax_id, registry_number, signature_data_url, signature_path"
        )
        .eq("user_id", request.ong_user_id)
        .single()
    : { data: null };

  const { data: certificate } = await supabase
    .from(DONATION_CERTIFICATES_TABLE)
    .select("operation_id, operation_hash, collected_at, snapshot")
    .eq("donation_id", id)
    .single();

  const snapshot = (certificate?.snapshot as CertificateSnapshot | null) ?? null;
  const snapshotDonation = snapshot?.donation ?? null;
  const snapshotCommerce = snapshot?.commerce ?? null;
  const snapshotOng = snapshot?.ong ?? null;

  const donationData = snapshotDonation ?? donation;
  const commerceData = snapshotCommerce ?? commerce;
  const ongData = snapshotOng ?? ong;
  const commerceSignature =
    snapshotCommerce?.signature_data_url ?? commerce?.signature_data_url ?? null;
  const ongSignature =
    snapshotOng?.signature_data_url ?? ong?.signature_data_url ?? null;

  const createdAt = snapshotDonation?.created_at ?? donation.created_at ?? null;
  const collectedAt =
    certificate?.collected_at ??
    snapshot?.collected_at ??
    donation.collected_at ??
    createdAt;
  const operationId =
    certificate?.operation_id ??
    snapshot?.operation_id ??
    `SF-${(createdAt ?? new Date().toISOString())
      .slice(0, 10)
      .replace(/-/g, "")}-${donation.id.slice(0, 8).toUpperCase()}`;
  const hash =
    certificate?.operation_hash ??
    snapshot?.operation_hash ??
    crypto
      .createHash("sha256")
      .update(`${donation.id}:${user.id}:${createdAt ?? ""}`)
      .digest("hex")
      .toUpperCase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const verificationUrl = `${siteUrl}/verificar?id=${encodeURIComponent(
    operationId
  )}`;

  const kgValue = Number(donationData?.kg ?? donation.kg ?? 0) || 0;
  const raciones = kgValue ? Math.max(1, Math.round(kgValue * 2)) : 0;
  const co2 = kgValue ? (kgValue * 2.5).toFixed(1) : "0.0";
  const personas = kgValue ? Math.max(1, Math.round(kgValue / 1)) : 0;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const margin = 40;
  const contentWidth = width - margin * 2;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const embedSignatureImage = async (dataUrl?: string | null) => {
    const parsed = parseImageDataUrl(dataUrl);
    if (!parsed) {
      return null;
    }
    if (parsed.mime === "image/png") {
      return pdfDoc.embedPng(parsed.bytes);
    }
    return pdfDoc.embedJpg(parsed.bytes);
  };

  const commerceSignatureImage = await embedSignatureImage(commerceSignature);
  const ongSignatureImage = await embedSignatureImage(ongSignature);
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    margin: 1,
    width: 180,
  });
  const qrImage = await embedSignatureImage(qrDataUrl);

  const measure = (value: string, size: number) =>
    font.widthOfTextAtSize(value, size);

  let cursorY = height - margin;

  const drawTitle = (text: string) => {
    page.drawText(text, {
      x: margin,
      y: cursorY,
      size: 18,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });
    cursorY -= 26;
  };

  const drawSectionTitle = (text: string) => {
    cursorY -= 6;
    page.drawText(text, {
      x: margin,
      y: cursorY,
      size: 12,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });
    cursorY -= 16;
  };

  const drawParagraph = (text: string, size = 10) => {
    const lines = wrapText(text, contentWidth, (value) => measure(value, size));
    lines.forEach((line) => {
      page.drawText(line, {
        x: margin,
        y: cursorY,
        size,
        font,
        color: rgb(0.2, 0.23, 0.3),
      });
      cursorY -= size + 4;
    });
  };

  const drawLabelValue = (label: string, value: string) => {
    const text = `${label}: ${value || t.pdf.notReported}`;
    drawParagraph(text);
  };

  const drawSignatureBox = (
    label: string,
    image: PDFImage | null,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    page.drawText(label, {
      x,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.23, 0.3),
    });
    const boxY = y - 12 - height;
    page.drawRectangle({
      x,
      y: boxY,
      width,
      height,
      borderColor: rgb(0.85, 0.87, 0.9),
      borderWidth: 1,
    });

    if (image) {
      const maxWidth = width - 12;
      const maxHeight = height - 12;
      const scale = Math.min(
        maxWidth / image.width,
        maxHeight / image.height,
        1
      );
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      const imageX = x + (width - scaledWidth) / 2;
      const imageY = boxY + (height - scaledHeight) / 2;
      page.drawImage(image, {
        x: imageX,
        y: imageY,
        width: scaledWidth,
        height: scaledHeight,
      });
    } else {
      page.drawText(t.pdf.signatureMissing, {
        x: x + 8,
        y: boxY + height / 2 - 4,
        size: 8,
        font,
        color: rgb(0.45, 0.47, 0.52),
      });
    }

    return boxY - 12;
  };

  drawTitle(t.pdf.title);

  drawSectionTitle(t.pdf.sections.establishment);
  drawLabelValue(t.pdf.labels.commercialName, commerceData?.name ?? t.pdf.notReported);
  drawLabelValue(t.pdf.labels.taxId, commerceData?.tax_id ?? t.pdf.notReported);
  drawLabelValue(
    t.pdf.labels.address,
    commerceData?.address
      ? `${commerceData.address} ${commerceData.city ?? ""} ${commerceData.region ?? ""}`.trim()
      : t.pdf.notReported
  );
  drawLabelValue(
    t.pdf.labels.registryNumber,
    commerceData?.registry_number ?? t.pdf.notReported
  );

  drawSectionTitle(t.pdf.sections.receiver);
  drawLabelValue(t.pdf.labels.ongName, ongData?.name ?? t.pdf.notReported);
  drawLabelValue(t.pdf.labels.ongTaxId, ongData?.tax_id ?? t.pdf.notReported);
  drawLabelValue(
    t.pdf.labels.address,
    ongData?.address
      ? `${ongData.address} ${ongData.city ?? ""} ${ongData.region ?? ""}`.trim()
      : t.pdf.notReported
  );
  drawLabelValue(t.pdf.labels.ongRegistry, ongData?.registry_number ?? t.pdf.notReported);

  drawSectionTitle(t.pdf.sections.operation);
  drawLabelValue(t.pdf.labels.generatedDate, formatDate(createdAt, t.pdf.notReported));
  drawLabelValue(t.pdf.labels.collectedDate, formatDate(collectedAt, t.pdf.notReported));
  drawLabelValue(t.pdf.labels.time, formatTime(collectedAt, t.pdf.notReported));
  drawLabelValue(t.pdf.labels.internalId, operationId);

  drawSectionTitle(t.pdf.sections.foods);

  const tableX = margin;
  const tableY = cursorY;
  const rowHeight = 18;
  const columns = [150, 60, 50, 80, 90, 85];
  const headers = [
    t.pdf.table.product,
    t.pdf.table.quantity,
    t.pdf.table.unit,
    t.pdf.table.state,
    t.pdf.table.expiry,
    t.pdf.table.fit,
  ];

  page.drawRectangle({
    x: tableX,
    y: tableY - rowHeight,
    width: columns.reduce((a, b) => a + b, 0),
    height: rowHeight,
    color: rgb(0.94, 0.95, 0.97),
  });

  let cellX = tableX;
  headers.forEach((header, index) => {
    page.drawText(header, {
      x: cellX + 4,
      y: tableY - 13,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.23, 0.3),
    });
    cellX += columns[index];
  });

  const rowY = tableY - rowHeight;
  let rowX = tableX;
  const rowValues = [
    donationData?.title ?? donation.title ?? t.verification.surplusLabel,
    kgValue ? kgValue.toFixed(1) : "0",
    "kg",
    getDonationStateLabel(
      donationData?.storage ?? donation.storage ?? null,
      donationData?.category ?? donation.category ?? null
    ),
    formatDate(donationData?.expires_at ?? donation.expires_at, t.pdf.notReported),
    t.common.yes,
  ];

  rowValues.forEach((value, index) => {
    page.drawText(String(value), {
      x: rowX + 4,
      y: rowY - 13,
      size: 9,
      font,
      color: rgb(0.2, 0.23, 0.3),
    });
    rowX += columns[index];
  });

  cursorY = rowY - rowHeight - 6;

  drawSectionTitle(t.pdf.sections.legal);
  drawParagraph(t.pdf.paragraphs.legalDeclaration);

  drawSectionTitle(t.pdf.sections.reception);
  drawLabelValue(t.pdf.labels.ongResponsible, ongData?.name ?? t.pdf.notReported);
  drawLabelValue(t.pdf.labels.signatureRecorded, ongSignature ? t.common.yes : t.common.no);
  drawLabelValue(t.pdf.labels.date, formatDate(collectedAt, t.pdf.notReported));

  drawSectionTitle(t.pdf.sections.trace);
  drawLabelValue(t.pdf.labels.uniqueId, operationId);
  drawLabelValue(t.pdf.labels.verificationCode, hash);
  drawLabelValue(t.pdf.labels.verificationUrl, verificationUrl);
  drawParagraph(t.pdf.paragraphs.qrPrompt);
  const qrSize = 90;
  if (qrImage) {
    const qrY = cursorY - qrSize;
    page.drawImage(qrImage, {
      x: margin,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });
    cursorY = qrY - 12;
  } else {
    drawParagraph(t.pdf.paragraphs.qrUnavailable);
  }

  drawSectionTitle(t.pdf.sections.impact);
  drawLabelValue(t.pdf.labels.kgSaved, `${kgValue.toFixed(1)} kg`);
  drawLabelValue(t.pdf.labels.rations, String(raciones));
  drawLabelValue(t.pdf.labels.co2, `${co2} kg`);
  drawLabelValue(t.pdf.labels.people, String(personas));

  drawSectionTitle(t.pdf.sections.legalRef);
  drawParagraph(t.pdf.paragraphs.legalRef1);
  drawParagraph(t.pdf.paragraphs.legalRef2);

  drawSectionTitle(t.pdf.sections.digitalSignatures);
  const signatureBoxHeight = 70;
  const signatureGap = 16;
  const signatureBoxWidth = (contentWidth - signatureGap) / 2;
  const signatureTop = cursorY;
  const leftBottom = drawSignatureBox(
    t.admin.roleLabels.commerce,
    commerceSignatureImage,
    margin,
    signatureTop,
    signatureBoxWidth,
    signatureBoxHeight
  );
  const rightBottom = drawSignatureBox(
    t.admin.roleLabels.ong,
    ongSignatureImage,
    margin + signatureBoxWidth + signatureGap,
    signatureTop,
    signatureBoxWidth,
    signatureBoxHeight
  );
  cursorY = Math.min(leftBottom, rightBottom);
  drawParagraph(t.pdf.labels.seal);

  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer;
  const fileName = `certificado-${operationId}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Cache-Control": "no-store",
    },
  });
}

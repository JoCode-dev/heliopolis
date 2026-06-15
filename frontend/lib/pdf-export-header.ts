import type { jsPDF } from 'jspdf';
import { SITE_LOGO_PATH, SITE_NAME, SITE_TAGLINE } from '@/lib/metadata';
import { BRAND_CHART_COLORS } from '@/lib/chart-colors';

export const PDF_HEADER_HEIGHT = 32;
const MARGIN_LEFT = 14;
const LOGO_SIZE = 18;

let logoDataUrlCache: string | null | undefined;

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

export async function loadPdfLogoDataUrl(): Promise<string | null> {
  if (logoDataUrlCache !== undefined) {
    return logoDataUrlCache;
  }

  try {
    const response = await fetch(SITE_LOGO_PATH);
    if (!response.ok) {
      logoDataUrlCache = null;
      return null;
    }

    const blob = await response.blob();
    logoDataUrlCache = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return logoDataUrlCache;
  } catch {
    logoDataUrlCache = null;
    return null;
  }
}

export function drawPdfPageHeader(
  doc: jsPDF,
  logoDataUrl: string | null,
  options?: { tableTitle?: string },
): number {
  const top = 10;
  const textX = logoDataUrl ? MARGIN_LEFT + LOGO_SIZE + 4 : MARGIN_LEFT;
  const [nuitR, nuitG, nuitB] = hexToRgb(BRAND_CHART_COLORS.nuit);
  const [orR, orG, orB] = hexToRgb(BRAND_CHART_COLORS.or);

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'JPEG', MARGIN_LEFT, top, LOGO_SIZE, LOGO_SIZE);
  }

  doc.setTextColor(nuitR, nuitG, nuitB);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(SITE_NAME, textX, top + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(orR, orG, orB);
  doc.text(SITE_TAGLINE, textX, top + 13);

  let contentBottom = top + LOGO_SIZE;

  if (options?.tableTitle) {
    doc.setTextColor(nuitR, nuitG, nuitB);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(options.tableTitle, MARGIN_LEFT, contentBottom + 6);
    contentBottom += 10;
  }

  const separatorY = Math.max(contentBottom + 2, PDF_HEADER_HEIGHT - 2);
  doc.setDrawColor(orR, orG, orB);
  doc.setLineWidth(0.3);
  doc.line(
    MARGIN_LEFT,
    separatorY,
    doc.internal.pageSize.getWidth() - MARGIN_LEFT,
    separatorY,
  );

  return separatorY + 4;
}

/**
 * Gabarits PDF RH — charte MSK (logo, bleu #1D73BC, ink, pied légal).
 * Sources métier : contrats / attestation / solde / règlement / fiche paie MSK.
 */
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { company } from "@/lib/company";
import {
  formatDateFr,
  formatMoneyFr,
  toWinAnsi,
  toWinAnsiLines,
} from "@/lib/pdf/winansi";

export const BLUE = rgb(29 / 255, 115 / 255, 188 / 255);
export const INK = rgb(13 / 255, 19 / 255, 48 / 255);
const MUTED = rgb(100 / 255, 110 / 255, 130 / 135);
export const LIGHT = rgb(0.9, 0.94, 0.98);
const A4: [number, number] = [595.28, 841.89];
export const MARGIN = 48;

export type RhPersonInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  address?: string;
  birthDate?: string;
  idCard?: string;
  civility?: "M." | "Mme";
};

export type RhContractPdfInput = {
  kind: "TRAVAIL" | "STAGE" | "PRESTA";
  title: string;
  startDate: string;
  endDate?: string;
  salaryXof?: number;
  trialMonths?: number;
  notes?: string;
  employee: RhPersonInput;
  signaturePng?: Uint8Array | Buffer;
  signatureLabel?: string;
};

export type RhAttestationInput = {
  employee: RhPersonInput;
  startDate: string;
  endDate: string;
  jobTitle: string;
  place?: string;
  issueDate?: string;
  signaturePng?: Uint8Array | Buffer;
  signatureLabel?: string;
};

export type RhSoldeInput = {
  employee: RhPersonInput;
  amountXof: number;
  amountWords?: string;
  paymentRef?: string;
  issueDate?: string;
  includeAttestation?: boolean;
  signaturePng?: Uint8Array | Buffer;
};

export type RhReglementInput = {
  employee: RhPersonInput;
  issueDate?: string;
  signaturePng?: Uint8Array | Buffer;
};

export type RhPayslipInput = {
  employee: RhPersonInput;
  periodStart: string;
  periodEnd: string;
  baseSalaryXof: number;
  netSalaryXof?: number;
  contractTypeLabel?: string;
  leaveBalanceDays?: number;
  leaveTakenDays?: number;
  computedAt?: string;
  signaturePng?: Uint8Array | Buffer;
};

/**
 * Exportée pour `src/lib/studio/render-blocks.ts` (moteur central Studio
 * documentaire — gabarits ENGINE_BLOCKS). Même primitive pdf-lib que les
 * générateurs legacy RH/Commercial, pas de duplication de la charte.
 */
export type Ctx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  fontOblique: PDFFont;
  width: number;
  height: number;
  y: number;
};

export function draw(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color?: ReturnType<typeof rgb>;
    maxWidth?: number;
  },
) {
  let t = toWinAnsi(text);
  if (opts.maxWidth) {
    while (
      opts.font.widthOfTextAtSize(t, opts.size) > opts.maxWidth &&
      t.length > 3
    ) {
      t = t.slice(0, -2);
    }
    if (t !== toWinAnsi(text) && t.length > 0) t = `${t}...`;
  }
  page.drawText(t, {
    x: opts.x,
    y: opts.y,
    size: opts.size,
    font: opts.font,
    color: opts.color ?? INK,
  });
}

function wrap(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const paras = toWinAnsiLines(text);
  const out: string[] = [];
  for (const para of paras.length ? paras : [toWinAnsi(text)]) {
    const words = para.split(" ").filter(Boolean);
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && cur) {
        out.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) out.push(cur);
  }
  return out.length ? out : [""];
}

async function embedLogo(pdf: PDFDocument) {
  const { embedBrandLogo } = await import("@/lib/pdf/embed-brand-logo");
  return embedBrandLogo(pdf);
}

export async function createCtx(): Promise<Ctx> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const { width, height } = page.getSize();
  return {
    pdf,
    page,
    font,
    fontBold,
    fontOblique,
    width,
    height,
    y: height - MARGIN,
  };
}

export function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y - needed > MARGIN + 40) return;
  drawFooter(ctx);
  ctx.page = ctx.pdf.addPage(A4);
  ctx.width = ctx.page.getSize().width;
  ctx.height = ctx.page.getSize().height;
  ctx.y = ctx.height - MARGIN;
  drawMiniHeader(ctx);
}

function drawMiniHeader(ctx: Ctx) {
  draw(ctx.page, company.legalName, {
    x: MARGIN,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
    color: BLUE,
  });
  ctx.y -= 18;
}

export async function drawHeader(ctx: Ctx, title: string) {
  const logo = await embedLogo(ctx.pdf);
  if (logo) {
    const maxW = 120;
    const scale = maxW / logo.width;
    const h = logo.height * scale;
    ctx.page.drawImage(logo, {
      x: MARGIN,
      y: ctx.y - h,
      width: maxW,
      height: h,
    });
    ctx.y -= h + 8;
  } else {
    draw(ctx.page, company.legalName, {
      x: MARGIN,
      y: ctx.y,
      size: 14,
      font: ctx.fontBold,
      color: BLUE,
    });
    ctx.y -= 18;
  }
  draw(ctx.page, company.tagline, {
    x: MARGIN,
    y: ctx.y,
    size: 8,
    font: ctx.fontOblique,
    color: MUTED,
  });
  ctx.y -= 22;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 4,
    width: ctx.width - MARGIN * 2,
    height: 2,
    color: BLUE,
  });
  ctx.y -= 28;
  const tw = ctx.fontBold.widthOfTextAtSize(toWinAnsi(title), 16);
  draw(ctx.page, title, {
    x: (ctx.width - tw) / 2,
    y: ctx.y,
    size: 16,
    font: ctx.fontBold,
    color: INK,
  });
  ctx.y -= 28;
}

export function drawFooter(ctx: Ctx) {
  const footer1 = `Adresse : ${company.addressOneLine}`;
  const footer2 = `NIF : ${company.fiscalId}  ·  ${company.email}  ·  ${company.phones}`;
  const footer3 = "PUBLIC - MSKCREATION";
  const y1 = 32;
  const y2 = 20;
  const y3 = 10;
  const f1 = toWinAnsi(footer1);
  const f2 = toWinAnsi(footer2);
  const f3 = toWinAnsi(footer3);
  ctx.page.drawText(f1, {
    x: (ctx.width - ctx.font.widthOfTextAtSize(f1, 6.5)) / 2,
    y: y1,
    size: 6.5,
    font: ctx.font,
    color: MUTED,
  });
  ctx.page.drawText(f2, {
    x: (ctx.width - ctx.font.widthOfTextAtSize(f2, 6.5)) / 2,
    y: y2,
    size: 6.5,
    font: ctx.font,
    color: MUTED,
  });
  ctx.page.drawText(f3, {
    x: (ctx.width - ctx.fontOblique.widthOfTextAtSize(f3, 6)) / 2,
    y: y3,
    size: 6,
    font: ctx.fontOblique,
    color: MUTED,
  });
}

export function drawParagraph(ctx: Ctx, text: string, size = 9.5, gap = 13) {
  const lines = wrap(text, ctx.font, size, ctx.width - MARGIN * 2);
  for (const line of lines) {
    ensureSpace(ctx, gap + 8);
    draw(ctx.page, line, {
      x: MARGIN,
      y: ctx.y,
      size,
      font: ctx.font,
    });
    ctx.y -= gap;
  }
}

export function drawTitle(ctx: Ctx, text: string) {
  ensureSpace(ctx, 22);
  draw(ctx.page, text, {
    x: MARGIN,
    y: ctx.y,
    size: 11,
    font: ctx.fontBold,
    color: BLUE,
  });
  ctx.y -= 16;
}

/** Titre centré (ex. « ENTRE LES SOUSSIGNÉS ») — repère visuel type contrat réel. */
function drawCenteredTitle(ctx: Ctx, text: string, size = 10.5) {
  ensureSpace(ctx, 22);
  const t = toWinAnsi(text);
  const w = ctx.fontBold.widthOfTextAtSize(t, size);
  draw(ctx.page, text, {
    x: (ctx.width - w) / 2,
    y: ctx.y,
    size,
    font: ctx.fontBold,
    color: INK,
  });
  ctx.y -= 18;
}

/**
 * Tableau clé/valeur type fiche "méta contrat" ou "Partie" (bordure fine,
 * libellé gras à gauche, valeur à droite) — reproduit les tableaux à cellules
 * du PDF de référence « CONTRAT DE PRESTATION DE SERVICES » (hors dépôt).
 */
function drawKeyValueTable(
  ctx: Ctx,
  heading: string,
  rows: Array<[string, string]>,
) {
  const visibleRows = rows.filter(([, v]) => v && v.trim().length > 0);
  if (visibleRows.length === 0) return;
  const tableW = ctx.width - MARGIN * 2;
  const labelW = 150;
  const rowH = 16;
  const headingH = 18;
  ensureSpace(ctx, headingH + visibleRows.length * rowH + 6);

  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - headingH + 3,
    width: tableW,
    height: headingH,
    color: BLUE,
  });
  draw(ctx.page, heading, {
    x: MARGIN + 8,
    y: ctx.y - headingH + 8,
    size: 9,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  });
  ctx.y -= headingH;

  visibleRows.forEach(([label, value], i) => {
    const y0 = ctx.y - rowH + 4;
    if (i % 2 === 1) {
      ctx.page.drawRectangle({
        x: MARGIN,
        y: y0,
        width: tableW,
        height: rowH,
        color: LIGHT,
      });
    }
    draw(ctx.page, label, {
      x: MARGIN + 8,
      y: ctx.y - rowH + 9,
      size: 8.5,
      font: ctx.fontBold,
      color: INK,
    });
    draw(ctx.page, value, {
      x: MARGIN + labelW,
      y: ctx.y - rowH + 9,
      size: 8.5,
      font: ctx.font,
      color: INK,
      maxWidth: tableW - labelW - 10,
    });
    ctx.y -= rowH;
  });
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y + visibleRows.length * rowH,
    width: tableW,
    height: 0.6,
    color: MUTED,
  });
  ctx.y -= 10;
}

function employerIntro(): string {
  return (
    `La société ${company.legalName}, société à responsabilité limitée au capital de ${company.capital}, ` +
    `dont le siège social est situé à Bamako, ${company.addressOneLine}, immatriculée au Registre du Commerce ` +
    `et du Crédit Mobilier (RCCM) sous le numéro ${company.rccm}, représentée par Monsieur ${company.managerName}, ` +
    `en sa qualité de ${company.managerTitle}, ci-après dénommée « l'Employeur » ou « la Société », d'une part,`
  );
}

function personFullName(p: RhPersonInput) {
  const civ = p.civility ?? "M.";
  return `${civ} ${p.firstName} ${p.lastName}`;
}

export async function drawSignatureBlock(
  ctx: Ctx,
  leftLabel: string,
  rightLabel: string,
  signaturePng?: Uint8Array | Buffer,
  signatureLabel?: string,
  printedStatement?: string,
) {
  ensureSpace(ctx, 100);
  ctx.y -= 10;
  draw(ctx.page, leftLabel, {
    x: MARGIN,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
  });
  draw(ctx.page, rightLabel, {
    x: ctx.width / 2 + 10,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
  });
  if (printedStatement) {
    ctx.y -= 14;
    draw(ctx.page, `« ${printedStatement} »`, {
      x: MARGIN,
      y: ctx.y,
      size: 8,
      font: ctx.fontOblique,
      color: MUTED,
    });
    draw(ctx.page, `« ${printedStatement} »`, {
      x: ctx.width / 2 + 10,
      y: ctx.y,
      size: 8,
      font: ctx.fontOblique,
      color: MUTED,
    });
  }
  ctx.y -= 50;
  if (signaturePng) {
    try {
      const img = await ctx.pdf.embedPng(signaturePng);
      const maxW = 120;
      const scale = Math.min(maxW / img.width, 40 / img.height);
      ctx.page.drawImage(img, {
        x: MARGIN,
        y: ctx.y,
        width: img.width * scale,
        height: img.height * scale,
      });
      if (signatureLabel) {
        draw(ctx.page, signatureLabel, {
          x: MARGIN,
          y: ctx.y - 12,
          size: 8,
          font: ctx.fontOblique,
          color: MUTED,
        });
      }
    } catch {
      /* ignore bad png */
    }
  }
  ctx.y -= 30;
}

function workScheduleArticle(): string {
  return (
    `La durée hebdomadaire de travail sera de ${company.weeklyHours} heures, réparties du lundi au vendredi. ` +
    `Horaire type : lundi, mardi, jeudi, vendredi de 8h à 17h (pause 1h) ; mercredi de 8h à 17h (télétravail possible).`
  );
}

// Clauses légales communes (invariantes) — texte identique au modèle MSK de
// référence hors dépôt (Contrat de Travail…, Contrat de Stage…
// Yaye Bah.docx) pour les points non spécifiques au contrat (confidentialité,
// matériel, PI, discipline, achats, résiliation, dispositions générales).
function confidentialityArticle(personLabel: string): string {
  return (
    `${personLabel} s'engage à conserver confidentiels, pendant toute la durée du contrat et après sa cessation, ` +
    `tous les documents, informations, procédés techniques, bases de données, codes sources, identifiants, informations ` +
    `commerciales ou stratégiques dont il/elle pourrait avoir connaissance dans le cadre de ses fonctions. Toute ` +
    `divulgation non autorisée fera l'objet de poursuites disciplinaires et/ou judiciaires.`
  );
}

function materielArticle(personLabel: string): string {
  return (
    `${personLabel} s'engage à utiliser avec soin tout matériel, équipement ou ressource mis à sa disposition par ` +
    `l'entreprise. Sauf autorisation écrite, tout matériel fourni (ordinateur, téléphone, logiciels, supports, etc.) ` +
    `doit rester dans l'enceinte de l'entreprise et ne peut être utilisé à des fins personnelles. En cas de ` +
    `télétravail autorisé, les règles de sécurité et de confidentialité restent applicables.`
  );
}

function propertyArticle(personLabel: string): string {
  return (
    `Tout travail, développement, montage, code, design, contenu, base de données, logiciel, application ou ` +
    `système réalisé par ${personLabel.toLowerCase()} dans le cadre de son contrat, ou avec les moyens de ` +
    `l'entreprise, demeure la propriété exclusive de ${company.legalName}. ${personLabel} cède, à titre exclusif ` +
    `et gratuit, l'ensemble de ses droits de propriété intellectuelle sur lesdites créations.`
  );
}

function disciplineArticle(): string {
  return (
    `Tout manquement aux obligations contractuelles pourra donner lieu à des sanctions disciplinaires ` +
    `conformément aux dispositions du Code du travail malien, pouvant aller de l'avertissement au licenciement ` +
    `pour faute grave.`
  );
}

function achatsLogicielsArticle(
  nounGenitive: "du salarié" | "du/de la stagiaire",
  personLabel: "le salarié" | "le/la stagiaire",
): string {
  return (
    `Tout achat de logiciel, abonnement, service en ligne, banque d'image, ou autre ressource nécessaire à ` +
    `l'exercice des missions ${nounGenitive}, doit être pré-approuvé par l'entreprise et pris en charge ` +
    `financièrement par ${company.legalName}. Aucun frais ne sera supporté personnellement par ${personLabel}.`
  );
}

function resiliationArticle(): string {
  return (
    `Le présent contrat peut être résilié par l'une ou l'autre des parties moyennant le respect du préavis légal ` +
    `en vigueur au Mali, sauf en cas de faute grave justifiant un licenciement immédiat.`
  );
}

function dispositionsGeneralesArticle(): string {
  return (
    `Pour tout point non prévu au présent contrat, les parties se réfèrent aux dispositions du Code du travail ` +
    `de la République du Mali. Tout litige relatif à l'interprétation ou à l'exécution du présent contrat ` +
    `relèvera de la compétence des juridictions maliennes compétentes.`
  );
}

/**
 * Contrat de travail (CDI/CDD) — structure alignée sur le modèle MSK de
 * référence hors dépôt (« Contrat de Travail… »). v2
 * (2026-11-08) : accents restaurés + articles Congés payés, Sécurité sociale
 * (INPS/CANAM), Matériel, Discipline, Achats logiciels, Résiliation et
 * Dispositions générales ajoutés (clauses légales invariantes, texte repris
 * du modèle réel). Volontairement non repris (adaptations spécifiques à
 * l'instance de référence, pas du socle contractuel générique) : avantages
 * en nature détaillés, télétravail hebdomadaire fixe, prime de 13e mois —
 * ces éléments relèvent d'une politique RH par poste, pas du gabarit
 * standard (voir `docs/guides/SUIVI-GUIDES.md`).
 */
export async function generateContractTravailPdf(
  input: RhContractPdfInput,
): Promise<Uint8Array> {
  const ctx = await createCtx();
  await drawHeader(ctx, "CONTRAT DE TRAVAIL");

  drawParagraph(ctx, employerIntro());
  ctx.y -= 8;
  drawParagraph(ctx, "Et :");
  ctx.y -= 4;
  drawParagraph(
    ctx,
    `${personFullName(input.employee)}${input.employee.birthDate ? `, né(e) le ${input.employee.birthDate}` : ""}` +
      `${input.employee.address ? `, demeurant à ${input.employee.address}` : ""}` +
      `${input.employee.idCard ? `, titulaire de la pièce d'identité n° ${input.employee.idCard}` : ""}.` +
      ` Ci-après dénommé(e) « le Salarié », d'autre part.`,
  );
  ctx.y -= 6;
  drawParagraph(ctx, "Il est convenu ce qui suit :");
  ctx.y -= 8;

  drawTitle(ctx, "Article 1 : Objet du contrat");
  drawParagraph(
    ctx,
    `Le salarié est recruté par la société en qualité de ${input.employee.jobTitle ?? input.title} ` +
      `relevant de la grille interne de classification de ${company.legalName}. ` +
      `Ce poste s'inscrit dans le cadre des dispositions du Code du travail de la République du Mali.`,
  );

  drawTitle(ctx, "Article 2 : Lieu de travail");
  drawParagraph(
    ctx,
    `Le salarié exercera ses fonctions dans les locaux de ${company.legalName} situés à Bamako, ${company.addressOneLine}. ` +
      `En fonction des nécessités de service, le salarié pourra être amené à se déplacer.`,
  );

  drawTitle(ctx, "Article 3 : Date d'embauche");
  drawParagraph(
    ctx,
    `Le présent contrat prend effet le ${input.startDate}` +
      (input.endDate
        ? ` et est conclu jusqu'au ${input.endDate}.`
        : ` et est conclu pour une durée indéterminée.`),
  );

  drawTitle(ctx, "Article 4 : Période d'essai");
  drawParagraph(
    ctx,
    `Période d'essai de ${input.trialMonths ?? 3} mois, reconduction possible d'1 mois avec accord écrit. ` +
      `Délai de prévenance : 3 semaines pour chaque partie.`,
  );

  drawTitle(ctx, "Article 5 : Durée du travail");
  drawParagraph(ctx, workScheduleArticle());

  drawTitle(ctx, "Article 6 : Rémunération");
  drawParagraph(
    ctx,
    input.salaryXof
      ? `En contrepartie, le salarié percevra une rémunération mensuelle nette de ${formatMoneyFr(input.salaryXof)} ${company.currency}, ` +
        `versée à terme échu par virement ou tout mode autorisé.`
      : `La rémunération est fixée d'un commun accord et précisée en annexe ou avenant.`,
  );

  drawTitle(ctx, "Article 7 : Congés payés");
  drawParagraph(
    ctx,
    `Le salarié bénéficiera de congés payés selon les conditions fixées par les dispositions légales et ` +
      `conventionnelles applicables. Les dates de départ en congé seront fixées en concertation avec ` +
      `l'employeur, en tenant compte des nécessités de service. À l'issue du présent contrat, les congés payés ` +
      `acquis et non pris donneront lieu au versement d'une indemnité compensatrice, calculée sur la base de la ` +
      `rémunération nette perçue par le salarié.`,
    8.5,
  );

  drawTitle(ctx, "Article 8 : Sécurité sociale, retraite et prévoyance");
  drawParagraph(
    ctx,
    `Le salarié est affilié à l'Institut National de Prévoyance Sociale (INPS) pour la couverture des prestations ` +
      `sociales obligatoires, notamment en matière de retraite, de maternité, d'accidents du travail et de ` +
      `maladies professionnelles, conformément aux dispositions légales en vigueur. Il bénéficie également de la ` +
      `Caisse Nationale d'Assurance Maladie (CANAM), au titre de la couverture maladie universelle.`,
    8.5,
  );

  drawTitle(ctx, "Article 9 : Confidentialité");
  drawParagraph(ctx, confidentialityArticle("Le salarié"), 8.5);

  drawTitle(ctx, "Article 10 : Matériel et outils de travail");
  drawParagraph(ctx, materielArticle("Le salarié"), 8.5);

  drawTitle(ctx, "Article 11 : Propriété intellectuelle");
  drawParagraph(ctx, propertyArticle("Le salarié"), 8.5);

  drawTitle(ctx, "Article 12 : Discipline et sanctions");
  drawParagraph(ctx, disciplineArticle());

  drawTitle(ctx, "Article 13 : Achats de logiciels, licences et ressources");
  drawParagraph(ctx, achatsLogicielsArticle("du salarié", "le salarié"), 8.5);

  drawTitle(ctx, "Article 14 : Résiliation du contrat");
  drawParagraph(ctx, resiliationArticle());

  if (input.notes) {
    drawTitle(ctx, "Article 15 : Dispositions particulières");
    drawParagraph(ctx, input.notes);
  }

  drawTitle(ctx, input.notes ? "Article 16 : Dispositions générales" : "Article 15 : Dispositions générales");
  drawParagraph(ctx, dispositionsGeneralesArticle(), 8.5);

  ctx.y -= 8;
  drawParagraph(
    ctx,
    `Fait à Bamako, le ${formatDateFr()}, en deux (02) exemplaires originaux, dont un remis à chaque partie.`,
  );
  await drawSignatureBlock(
    ctx,
    `Pour ${company.legalName}`,
    "Le Salarié",
    input.signaturePng,
    input.signatureLabel,
  );
  drawFooter(ctx);
  return ctx.pdf.save();
}

/**
 * Contrat de stage professionnel — structure alignée sur le modèle MSK de
 * référence hors dépôt (« Contrat de Stage… »). v2 (2026-11-08) :
 * accents restaurés + articles Matériel, Discipline, Achats logiciels,
 * Résiliation et Dispositions générales ajoutés (clauses invariantes du
 * socle contrat travail/stage). Congés payés et Sécurité sociale (INPS)
 * volontairement absents : absents aussi du modèle de référence stage
 * (statut non-salarié).
 */
export async function generateContractStagePdf(
  input: RhContractPdfInput,
): Promise<Uint8Array> {
  const ctx = await createCtx();
  await drawHeader(ctx, "CONTRAT DE STAGE PROFESSIONNEL");

  drawParagraph(ctx, employerIntro());
  ctx.y -= 8;
  drawParagraph(ctx, "Et :");
  drawParagraph(
    ctx,
    `${personFullName(input.employee)}${input.employee.birthDate ? `, né(e) le ${input.employee.birthDate}` : ""}` +
      `${input.employee.address ? `, demeurant à ${input.employee.address}` : ""}.` +
      ` Ci-après dénommé(e) « le/la Stagiaire », d'autre part.`,
  );
  ctx.y -= 6;
  drawParagraph(ctx, "Il est convenu ce qui suit :");
  ctx.y -= 8;

  drawTitle(ctx, "Article 1 : Objet");
  drawParagraph(
    ctx,
    `Le/la stagiaire est accueilli(e) en qualité de ${input.employee.jobTitle ?? "Stagiaire"} ` +
      `dans le cadre d'un stage professionnel au sein de ${company.legalName}.`,
  );

  drawTitle(ctx, "Article 2 : Lieu");
  drawParagraph(
    ctx,
    `Stage effectué à Bamako, ${company.addressOneLine}, sauf déplacements liés à la mission.`,
  );

  drawTitle(ctx, "Article 3 : Durée");
  drawParagraph(
    ctx,
    `Le stage prend effet le ${input.startDate}` +
      (input.endDate
        ? ` et s'achève le ${input.endDate}.`
        : ` pour une durée déterminée précisée par avenant.`),
  );

  drawTitle(ctx, "Article 4 : Horaires");
  drawParagraph(ctx, workScheduleArticle());

  drawTitle(ctx, "Article 5 : Gratification");
  drawParagraph(
    ctx,
    input.salaryXof
      ? `Gratification mensuelle nette de ${formatMoneyFr(input.salaryXof)} ${company.currency}, versée à terme échu.`
      : `La gratification éventuelle est précisée en annexe.`,
  );

  drawTitle(ctx, "Article 6 : Confidentialité");
  drawParagraph(ctx, confidentialityArticle("Le/la stagiaire"), 8.5);

  drawTitle(ctx, "Article 7 : Matériel et outils de travail");
  drawParagraph(ctx, materielArticle("Le/la stagiaire"), 8.5);

  drawTitle(ctx, "Article 8 : Propriété intellectuelle");
  drawParagraph(ctx, propertyArticle("Le/la stagiaire"), 8.5);

  drawTitle(ctx, "Article 9 : Discipline et sanctions");
  drawParagraph(ctx, disciplineArticle());

  drawTitle(ctx, "Article 10 : Achats de logiciels, licences et ressources");
  drawParagraph(ctx, achatsLogicielsArticle("du/de la stagiaire", "le/la stagiaire"), 8.5);

  drawTitle(ctx, "Article 11 : Résiliation du contrat");
  drawParagraph(ctx, resiliationArticle());

  if (input.notes) {
    drawTitle(ctx, "Article 12 : Dispositions particulières");
    drawParagraph(ctx, input.notes);
  }

  drawTitle(ctx, input.notes ? "Article 13 : Dispositions générales" : "Article 12 : Dispositions générales");
  drawParagraph(ctx, dispositionsGeneralesArticle(), 8.5);

  ctx.y -= 6;
  drawParagraph(
    ctx,
    `Fait à Bamako, le ${formatDateFr()}, en deux (02) exemplaires originaux.`,
  );
  await drawSignatureBlock(
    ctx,
    `Pour ${company.legalName}`,
    "Le/la Stagiaire",
    input.signaturePng,
    input.signatureLabel,
  );
  drawFooter(ctx);
  return ctx.pdf.save();
}

/**
 * Contrat de prestation de services — prestataire indépendant travaillant
 * pour MSK (relation inversée vs les contrats clients Commercial : MSK est ici
 * « le Client », la personne est « le Prestataire »). v3 (2026-11-08) — clôt
 * les écarts recensés dans
 * `docs/commercial/COMPARAISON-CONTRAT-PRESTA-MSK-v2.md` face au PDF réel
 * PDF hors dépôt « CONTRAT DE PRESTATION DE SERVICES » : tableau méta (date d'effet /
 * durée / droit applicable), tableaux Parties (avec e-mail/téléphone),
 * confidentialité réciproque, obligations Prestataire ET Client, clause
 * « effets de la résiliation », notification d'incident (données
 * personnelles), exclusions de responsabilité, avenant écrit + divisibilité,
 * mention « Lu et approuvé » imprimée. Les clauses non transposables au cas
 * RH individuel (grille d'offres packagées, bon de commande, processus de
 * validation de contenus) restent volontairement absentes — ce ne sont pas
 * des oublis mais une adaptation documentée au contexte RH (mission
 * individuelle, pas abonnement agence→client).
 */
export async function generateContractPrestaPdf(
  input: RhContractPdfInput,
): Promise<Uint8Array> {
  const ctx = await createCtx();
  await drawHeader(ctx, "CONTRAT DE PRESTATION DE SERVICES");
  drawCenteredTitle(ctx, input.title, 10);
  ctx.y -= 4;

  // --- Tableau méta (date d'effet / durée / droit applicable) ---
  drawKeyValueTable(ctx, "INFORMATIONS CLES", [
    ["Date d'effet", input.startDate],
    [
      "Durée",
      input.endDate
        ? `Du ${input.startDate} au ${input.endDate}, sauf reconduction expresse par avenant écrit`
        : "Durée indéterminée, sauf accord contraire précisé par avenant",
    ],
    ["Droit applicable", "Droit malien - Juridictions de Bamako"],
  ]);

  drawCenteredTitle(ctx, "ENTRE LES SOUSSIGNÉS");

  // --- Tableau « LE CLIENT » (MSK) ---
  drawKeyValueTable(ctx, "LE CLIENT", [
    ["Raison sociale", company.legalName],
    ["Forme juridique", company.legalForm],
    ["Identifiant fiscal", company.fiscalId],
    ["Siège social", `Bamako, ${company.addressOneLine}`],
    ["Représentant légal", `${company.managerName} - ${company.managerTitle}`],
    ["E-mail", company.email],
    ["Téléphone", company.phones],
  ]);

  // --- Tableau « LE PRESTATAIRE » (personne) ---
  drawKeyValueTable(ctx, "LE PRESTATAIRE", [
    ["Nom", personFullName(input.employee)],
    [
      "Qualité",
      `Prestataire indépendant${input.employee.jobTitle ? ` - ${input.employee.jobTitle}` : ""}`,
    ],
    ["Pièce d'identité", input.employee.idCard ?? ""],
    ["Adresse", input.employee.address ?? ""],
    ["E-mail", input.employee.email ?? ""],
    ["Téléphone", input.employee.phone ?? ""],
  ]);

  drawParagraph(
    ctx,
    `Ci-après désignés ensemble « les Parties » et individuellement « la Partie ». Il a été convenu et arrêté ce qui suit :`,
  );
  ctx.y -= 6;

  drawTitle(ctx, "Article 1 : Objet");
  drawParagraph(
    ctx,
    `Le Prestataire s'engage à réaliser pour ${company.legalName} la prestation suivante : ${input.title}. Le présent contrat encadre les conditions d'exécution, de rémunération et de responsabilité des Parties.`,
  );

  drawTitle(ctx, "Article 2 : Durée et résiliation");
  drawParagraph(
    ctx,
    `2.1 Durée initiale. La prestation prend effet le ${input.startDate}` +
      (input.endDate
        ? ` et s'achève le ${input.endDate}, sauf reconduction expresse par avenant écrit.`
        : ` pour une durée indéterminée, sauf accord contraire précisé par avenant.`),
  );
  drawParagraph(
    ctx,
    `2.2 Résiliation ordinaire. Chaque Partie peut résilier le présent contrat par préavis écrit de trente (30) jours.`,
  );
  drawParagraph(
    ctx,
    `2.3 Résiliation pour manquement grave. En cas de manquement grave (non-exécution, non-paiement, divulgation non autorisée), la Partie lésée peut résilier sans indemnité après mise en demeure restée sans effet pendant quinze (15) jours.`,
    8.5,
  );
  drawParagraph(
    ctx,
    `2.4 Effets de la résiliation. Le Prestataire restitue sous quarante-huit (48) heures tout accès, matériel ou document confié par ${company.legalName} ; les sommes dues au titre des prestations exécutées avant la date de résiliation demeurent exigibles ; les livrables déjà réalisés et réglés restent acquis au Client.`,
    8.5,
  );

  drawTitle(ctx, "Article 3 : Rémunération et modalités de paiement");
  drawParagraph(
    ctx,
    input.salaryXof
      ? `Honoraires : ${formatMoneyFr(input.salaryXof)} ${company.currency} (hors taxes le cas échéant), réglés par virement bancaire, Orange Money, Wave ou chèque, à réception de facture, selon les modalités convenues entre les Parties.`
      : `Les honoraires sont précisés en annexe ou avenant, réglés selon les modalités convenues entre les Parties.`,
  );
  drawParagraph(
    ctx,
    `Tout retard de paiement imputable au Client peut donner lieu à une pénalité de 1 % par semaine de retard, sans mise en demeure préalable. En cas de retard de paiement supérieur à quinze (15) jours, le Prestataire peut suspendre l'exécution de la prestation après notification écrite au Client.`,
    8.5,
  );

  drawTitle(ctx, "Article 4 : Indépendance");
  drawParagraph(
    ctx,
    `Le Prestataire reste indépendant dans l'organisation de son travail ; le présent contrat ne constitue ni un contrat de travail ni un lien de subordination avec ${company.legalName}.`,
  );

  drawTitle(ctx, "Article 5 : Obligations du Prestataire");
  drawParagraph(
    ctx,
    `Le Prestataire s'engage à : exécuter la mission avec diligence et professionnalisme ; respecter l'image et l'identité de ${company.legalName} dans toute prestation réalisée pour son compte ; soumettre ses livrables à validation préalable avant toute diffusion ou publication ; informer sans délai le Client de toute difficulté rencontrée dans l'exécution de la mission. Le Prestataire est tenu à une obligation de moyens, non de résultat.`,
    8.5,
  );

  drawTitle(ctx, "Article 6 : Obligations du Client");
  drawParagraph(
    ctx,
    `${company.legalName} s'engage à : fournir au Prestataire les informations, accès et ressources nécessaires à l'exécution de la mission en temps utile ; valider ou refuser les livrables soumis dans un délai raisonnable ; régler les sommes dues aux échéances convenues ; ne pas modifier unilatéralement le périmètre de la mission sans accord écrit préalable du Prestataire.`,
    8.5,
  );

  drawTitle(ctx, "Article 7 : Propriété intellectuelle");
  drawParagraph(
    ctx,
    `Les livrables réalisés par le Prestataire dans le cadre de la mission sont cédés à ${company.legalName} à compter du règlement intégral des honoraires dus, sauf accord contraire écrit. Les éléments, outils, marques et méthodes fournis par ${company.legalName} demeurent sa propriété exclusive.`,
  );

  drawTitle(ctx, "Article 8 : Confidentialité");
  drawParagraph(
    ctx,
    `Chaque Partie s'engage à garder strictement confidentielles toutes les informations commerciales, financières, stratégiques ou techniques dont elle aurait connaissance du fait de l'exécution du présent contrat, pendant sa durée et pendant cinq (5) ans après sa cessation.`,
  );

  drawTitle(ctx, "Article 9 : Protection des données personnelles");
  drawParagraph(
    ctx,
    `Si la mission implique un traitement de données à caractère personnel, celui-ci est soumis à la loi n° 2013-015 du 21 mai 2013 relative à la protection des données personnelles au Mali (APDP). ${company.legalName} agit en qualité de Responsable du traitement ; le Prestataire traite les données uniquement sur instruction écrite, met en œuvre des mesures de sécurité appropriées, et notifie sans délai à ${company.legalName} toute violation de données ou incident de sécurité dont il aurait connaissance.`,
    8.5,
  );

  drawTitle(ctx, "Article 10 : Responsabilité et force majeure");
  drawParagraph(
    ctx,
    `La responsabilité du Prestataire est limitée au montant des honoraires perçus au titre de la présente mission. Aucune Partie n'est responsable des performances commerciales du Client, du fonctionnement des algorithmes de plateformes tierces, ni d'un manquement dû à un cas de force majeure. En cas de force majeure, la Partie concernée en informe l'autre sous 48 heures ; si l'événement persiste au-delà de 30 jours, chaque Partie peut résilier sans indemnité.`,
    8.5,
  );

  drawTitle(ctx, "Article 11 : Droit applicable et règlement des litiges");
  drawParagraph(
    ctx,
    `Le présent contrat est soumis au droit malien. En cas de litige, les Parties recherchent en priorité une solution amiable dans un délai de trente (30) jours ; à défaut, tout litige sera porté devant les juridictions compétentes de Bamako, République du Mali. Toute modification du présent contrat fait l'objet d'un avenant écrit signé des deux Parties. Si l'une des clauses du présent contrat est déclarée nulle ou inapplicable, les autres clauses conservent leur plein effet.`,
    8.5,
  );

  if (input.notes) {
    drawTitle(ctx, "Article 12 : Dispositions particulières");
    drawParagraph(ctx, input.notes);
  }

  drawTitle(ctx, "Article 13 : Signatures");
  drawParagraph(
    ctx,
    `Les soussignés déclarent avoir pris connaissance de l'ensemble des stipulations du présent contrat et les accepter sans réserve.`,
  );
  drawParagraph(ctx, `Fait à Bamako, le ${formatDateFr()}, en deux (2) exemplaires originaux.`);
  await drawSignatureBlock(
    ctx,
    `Pour ${company.legalName}`,
    "Le Prestataire",
    input.signaturePng,
    input.signatureLabel,
    "Lu et approuvé",
  );
  drawFooter(ctx);
  return ctx.pdf.save();
}

/**
 * Attestation de stage — structure alignée sur
 * attestation hors dépôt (v2, 2026-11-08) :
 * accents restaurés, phrase "pour servir et valoir" placée en tête (comme la
 * référence), ajout des deux phrases de qualification (assiduité /
 * professionnalisme) présentes dans le modèle réel.
 */
export async function generateAttestationStagePdf(
  input: RhAttestationInput,
): Promise<Uint8Array> {
  const ctx = await createCtx();
  await drawHeader(ctx, "ATTESTATION DE STAGE");

  drawParagraph(
    ctx,
    `La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.`,
  );
  ctx.y -= 6;
  drawParagraph(
    ctx,
    `Je soussigné(e), ${company.managerName}, ${company.managerTitle} de ${company.legalName}, certifie que :`,
  );
  ctx.y -= 10;

  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 70,
    width: ctx.width - MARGIN * 2,
    height: 78,
    color: LIGHT,
  });
  draw(ctx.page, personFullName(input.employee), {
    x: MARGIN + 12,
    y: ctx.y - 14,
    size: 12,
    font: ctx.fontBold,
  });
  draw(
    ctx.page,
    `a effectué un stage de ${input.jobTitle} au sein de ${company.legalName}`,
    {
      x: MARGIN + 12,
      y: ctx.y - 32,
      size: 10,
      font: ctx.font,
    },
  );
  draw(
    ctx.page,
    `du ${input.startDate} au ${input.endDate}` +
      (input.place ? ` — ${input.place}` : " — Bamako, Mali"),
    {
      x: MARGIN + 12,
      y: ctx.y - 48,
      size: 10,
      font: ctx.font,
    },
  );
  ctx.y -= 100;

  drawParagraph(
    ctx,
    `Au cours de cette période, ${personFullName(input.employee)} a toujours fait preuve de disponibilité, de dévouement, d'assiduité et de volonté dans les tâches qui lui ont été confiées.`,
    8.5,
  );
  drawParagraph(
    ctx,
    `Son professionnalisme et son esprit d'équipe ont été particulièrement appréciés de ses supérieurs et collègues.`,
  );
  ctx.y -= 8;
  drawParagraph(
    ctx,
    `Fait à Bamako, le ${input.issueDate ?? formatDateFr()}.`,
  );
  await drawSignatureBlock(
    ctx,
    `Pour ${company.legalName}`,
    "",
    input.signaturePng,
    input.signatureLabel ?? company.managerName,
  );
  drawFooter(ctx);
  return ctx.pdf.save();
}

/**
 * Solde de tout compte — structure alignée sur
 * solde hors dépôt (v2, 2026-11-08 : accents
 * restaurés).
 */
export async function generateSoldeToutComptePdf(
  input: RhSoldeInput,
): Promise<Uint8Array> {
  const ctx = await createCtx();
  await drawHeader(ctx, "SOLDE DE TOUT COMPTE");

  const words =
    input.amountWords ??
    `${formatMoneyFr(input.amountXof)} ${company.currency}`;

  drawParagraph(
    ctx,
    `Je soussigné(e) ${input.employee.firstName} ${input.employee.lastName}` +
      `${input.employee.address ? `, demeurant à ${input.employee.address}` : ""},`,
  );
  ctx.y -= 6;
  drawParagraph(
    ctx,
    `Reconnais avoir reçu de l'entreprise ${company.legalName}` +
      (input.includeAttestation !== false
        ? ` mon attestation de fin de relation ainsi que, `
        : ` `) +
      `pour solde de tout compte, la somme de ${formatMoneyFr(input.amountXof)} ${company.currency}` +
      ` (${words})` +
      (input.paymentRef ? ` — référence ${input.paymentRef}` : "") +
      `.`,
  );
  ctx.y -= 8;
  drawParagraph(
    ctx,
    `Je reconnais avoir été informé(e) des dispositions légales relatives au présent reçu pour solde de tout compte.`,
  );
  ctx.y -= 12;
  drawParagraph(
    ctx,
    `Fait à Bamako, le ${input.issueDate ?? formatDateFr()}.`,
  );
  ctx.y -= 20;
  draw(ctx.page, `${input.employee.firstName} ${input.employee.lastName}`, {
    x: MARGIN,
    y: ctx.y,
    size: 10,
    font: ctx.fontBold,
  });
  ctx.y -= 14;
  draw(ctx.page, 'Signature précédée de la mention « Bon pour solde de tout compte »', {
    x: MARGIN,
    y: ctx.y,
    size: 8,
    font: ctx.fontOblique,
    color: MUTED,
  });
  ctx.y -= 40;
  if (input.signaturePng) {
    try {
      const img = await ctx.pdf.embedPng(input.signaturePng);
      const scale = Math.min(120 / img.width, 40 / img.height);
      ctx.page.drawImage(img, {
        x: MARGIN,
        y: ctx.y,
        width: img.width * scale,
        height: img.height * scale,
      });
    } catch {
      /* ignore */
    }
  }
  drawFooter(ctx);
  return ctx.pdf.save();
}

/**
 * Accusé / résumé règlement intérieur (signature collab.). v2 (2026-11-08) :
 * accents restaurés + résumé aligné sur les 6 chapitres du document source
 * réel (règlement intérieur hors dépôt, Version
 * 1.0 — 2025, Code du travail malien Loi N°92-020 + OHADA). Le règlement
 * intérieur complet (22 articles, 6 chapitres, ~10 pages) reste un document
 * source géré en GED / annexé séparément — ce gabarit ne reproduit pas
 * l'intégralité du texte (hors scope d'un PDF généré dynamiquement par
 * contrat) ; il génère un résumé fidèle des chapitres + l'accusé de
 * réception signable, qui est la seule partie variable par collaborateur.
 */
export async function generateReglementInterieurPdf(
  input: RhReglementInput,
): Promise<Uint8Array> {
  const ctx = await createCtx();
  await drawHeader(ctx, "REGLEMENT INTERIEUR — ACCUSE DE RECEPTION");

  drawParagraph(
    ctx,
    `${company.legalName} SARL met à disposition de ses collaborateurs un règlement intérieur (Version 1.0 — 2025) ` +
      `établi en application du Code du travail de la République du Mali (Loi N°92-020) et de l'Acte uniforme OHADA, ` +
      `fixant les règles générales et permanentes relatives à la discipline, à l'hygiène, à la sécurité, à l'usage ` +
      `des ressources numériques et à la protection des données au sein de l'agence. Il est applicable à tous les ` +
      `collaborateurs MSK, quel que soit le type de contrat (CDI, CDD, stage, prestation).`,
    8.5,
  );
  ctx.y -= 6;

  const chapters = [
    {
      t: "Chapitre I. Organisation du travail et discipline",
      b: `Embauche et intégration, horaires et durée du travail, pointage et présence, accès aux locaux, absences et retards, conduite et relation clients.`,
    },
    {
      t: "Chapitre II. Usage du numérique, réseaux sociaux et confidentialité",
      b: `Utilisation du matériel et des ressources numériques, réseaux sociaux professionnels, confidentialité client, protection des données personnelles.`,
    },
    {
      t: "Chapitre III. Hygiène, sécurité et présentation professionnelle",
      b: `Hygiène des locaux, sécurité au travail, sécurité des équipements de production, accidents du travail, présentation professionnelle (dress code).`,
    },
    {
      t: "Chapitre IV. Sanctions disciplinaires et droits de la défense",
      b: `Échelle des sanctions (avertissement à licenciement pour faute lourde), garanties de procédure, prescription.`,
    },
    {
      t: "Chapitre V. Harcèlement, discriminations et protection des droits",
      b: `Prévention du harcèlement moral et sexuel, non-discrimination, procédure de signalement.`,
    },
    {
      t: "Chapitre VI. Dispositions finales",
      b: `Révision et mise à jour, entrée en vigueur, annexes (dress code, charte numérique, protection des données, procédures internes).`,
    },
  ];
  for (const a of chapters) {
    drawTitle(ctx, a.t);
    drawParagraph(ctx, a.b, 8.5);
  }
  drawParagraph(
    ctx,
    `Document complet disponible auprès de la Direction et sur l'intranet MSK (SharePoint) ; remis à chaque nouveau collaborateur lors de son intégration et annexé obligatoirement au contrat de travail.`,
    8,
    11,
  );

  ctx.y -= 10;
  ensureSpace(ctx, 100);
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 56,
    width: ctx.width - MARGIN * 2,
    height: 64,
    color: LIGHT,
  });
  draw(
    ctx.page,
    `Je soussigné(e) ${input.employee.firstName} ${input.employee.lastName}, ` +
      `reconnais avoir reçu, lu et pris connaissance du règlement intérieur de ${company.legalName} ` +
      `(Version 1.0 — 2025) et m'engage à le respecter.`,
    {
      x: MARGIN + 10,
      y: ctx.y - 18,
      size: 9,
      font: ctx.font,
      maxWidth: ctx.width - MARGIN * 2 - 20,
    },
  );
  draw(ctx.page, `Date : ${input.issueDate ?? formatDateFr()}`, {
    x: MARGIN + 10,
    y: ctx.y - 40,
    size: 9,
    font: ctx.fontBold,
  });
  ctx.y -= 90;

  await drawSignatureBlock(
    ctx,
    "Signature du collaborateur",
    `Pour ${company.legalName}`,
    input.signaturePng,
  );
  drawFooter(ctx);
  return ctx.pdf.save();
}

/** Taux global de cotisations sociales Mali (INPS + CANAM) — identique au modèle réel. */
const MONTHLY_HOURS = 173.33;
const SOCIAL_CONTRIBUTIONS: Array<{ label: string; rate: number }> = [
  { label: "Accident de Travail", rate: 0.02 },
  { label: "Prestations Familiales", rate: 0.08 },
  { label: "Retraite", rate: 0.07 },
  { label: "Invalidite", rate: 0.02 },
  { label: "ANPE", rate: 0.01 },
  { label: "AMO (employeur)", rate: 0.035 },
  { label: "AMO (employe)", rate: 0.0306 },
];
const TOTAL_CONTRIBUTION_RATE = SOCIAL_CONTRIBUTIONS.reduce(
  (sum, c) => sum + c.rate,
  0,
);

/**
 * Fiche de paie simplifiée (aperçu — cotisations indicatives Mali). v2
 * (2026-11-08) : accents restaurés + calcul du salaire brut par application
 * inversée du taux de cotisations (26,56 %) au salaire net contractuel,
 * aligné sur fiche de paie hors dépôt (224 673 F brut / 165 000 F
 * net / 59 673 F de cotisations pour un contractuel à 165 000 F net — mêmes
 * montants). Le détail "Département / État civil" du bulletin officiel
 * n'est pas repris (champs non présents dans `RhPersonInput` — nécessiterait
 * une évolution du modèle RH, hors scope de cet alignement). Document
 * indicatif — le module Paie / INPS (Phase 5) finalisera les cotisations
 * officielles (mention déjà présente dans le gabarit).
 */
export async function generateFichePaiePdf(
  input: RhPayslipInput,
): Promise<Uint8Array> {
  const ctx = await createCtx();
  await drawHeader(ctx, "BULLETIN DE SALAIRE");

  const net = input.netSalaryXof ?? input.baseSalaryXof;
  const base = Math.round(net / (1 - TOTAL_CONTRIBUTION_RATE));
  const grossHourly = Math.round(base / MONTHLY_HOURS);
  const netHourly = Math.round(net / MONTHLY_HOURS);

  // Infos employé
  const leftX = MARGIN;
  const rightX = ctx.width / 2 + 8;
  const rows: [string, string, string, string][] = [
    [
      "Nom",
      `${input.employee.lastName} ${input.employee.firstName}`,
      "Salaire contractuel (net)",
      `${formatMoneyFr(net)} ${company.currency}`,
    ],
    [
      "E-mail",
      input.employee.email ?? "—",
      "Période de paie",
      `${input.periodStart} - ${input.periodEnd}`,
    ],
    [
      "Fonction",
      input.employee.jobTitle ?? "—",
      "Calculé le",
      input.computedAt ?? formatDateFr(),
    ],
    [
      "Contrat",
      input.contractTypeLabel ?? "Temps plein",
      "Horaire de travail",
      `${company.weeklyHours} h / semaine`,
    ],
    [
      "Adresse",
      input.employee.address ?? "—",
      "Taux horaire brut",
      `${formatMoneyFr(grossHourly)} ${company.currency}`,
    ],
    [
      "ID",
      input.employee.idCard ?? "—",
      "Taux horaire net",
      `${formatMoneyFr(netHourly)} ${company.currency}`,
    ],
  ];
  for (const [l1, v1, l2, v2] of rows) {
    draw(ctx.page, `${l1} :`, {
      x: leftX,
      y: ctx.y,
      size: 8,
      font: ctx.font,
      color: MUTED,
    });
    draw(ctx.page, v1, {
      x: leftX + 70,
      y: ctx.y,
      size: 9,
      font: ctx.fontBold,
      maxWidth: 180,
    });
    draw(ctx.page, `${l2} :`, {
      x: rightX,
      y: ctx.y,
      size: 8,
      font: ctx.font,
      color: MUTED,
    });
    draw(ctx.page, v2, {
      x: rightX + 110,
      y: ctx.y,
      size: 9,
      font: ctx.fontBold,
      maxWidth: 140,
    });
    ctx.y -= 14;
  }
  ctx.y -= 10;

  // Table cotisations (indicatif) — calculées sur le salaire brut reconstitué
  const cotis = SOCIAL_CONTRIBUTIONS;
  const contentW = ctx.width - MARGIN * 2;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 4,
    width: contentW,
    height: 18,
    color: BLUE,
  });
  draw(ctx.page, "Rubrique", {
    x: MARGIN + 8,
    y: ctx.y,
    size: 8,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  });
  draw(ctx.page, "Taux", {
    x: MARGIN + 280,
    y: ctx.y,
    size: 8,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  });
  draw(ctx.page, "Montant", {
    x: MARGIN + 360,
    y: ctx.y,
    size: 8,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  });
  ctx.y -= 22;

  draw(ctx.page, "Salaire brut", {
    x: MARGIN + 8,
    y: ctx.y,
    size: 9,
    font: ctx.font,
  });
  draw(ctx.page, `${formatMoneyFr(base)} ${company.currency}`, {
    x: MARGIN + 360,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
  });
  ctx.y -= 16;

  let totalCotis = 0;
  for (const c of cotis) {
    const amt = Math.round(base * c.rate);
    totalCotis += amt;
    draw(ctx.page, c.label, {
      x: MARGIN + 8,
      y: ctx.y,
      size: 8.5,
      font: ctx.font,
    });
    draw(ctx.page, `${(c.rate * 100).toFixed(2)} %`, {
      x: MARGIN + 280,
      y: ctx.y,
      size: 8.5,
      font: ctx.font,
    });
    draw(ctx.page, `${formatMoneyFr(amt)} ${company.currency}`, {
      x: MARGIN + 360,
      y: ctx.y,
      size: 8.5,
      font: ctx.font,
    });
    ctx.y -= 13;
  }
  ctx.y -= 6;
  draw(ctx.page, "Total charges sociales (indicatif)", {
    x: MARGIN + 8,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
  });
  draw(ctx.page, `${formatMoneyFr(totalCotis)} ${company.currency}`, {
    x: MARGIN + 360,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
  });
  ctx.y -= 20;

  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 8,
    width: contentW,
    height: 28,
    color: LIGHT,
  });
  draw(ctx.page, "Net à payer", {
    x: MARGIN + 8,
    y: ctx.y,
    size: 11,
    font: ctx.fontBold,
    color: BLUE,
  });
  draw(ctx.page, `${formatMoneyFr(net)} ${company.currency}`, {
    x: MARGIN + 360,
    y: ctx.y,
    size: 11,
    font: ctx.fontBold,
    color: BLUE,
  });
  ctx.y -= 40;

  const leaveBal = input.leaveBalanceDays ?? 0;
  const leaveTaken = input.leaveTakenDays ?? 0;
  drawParagraph(
    ctx,
    `Congés payés : solde ${leaveBal} j · pris ${leaveTaken} j · restants ${Math.max(leaveBal - leaveTaken, 0)} j.`,
  );
  drawParagraph(
    ctx,
    `Document indicatif — le module Paie / INPS (Phase 5) finalisera les cotisations officielles.`,
    8,
    11,
  );

  drawFooter(ctx);
  return ctx.pdf.save();
}

export async function generateRhPdfByKind(
  kind:
    | "TRAVAIL"
    | "STAGE"
    | "PRESTA"
    | "ATTESTATION"
    | "SOLDE"
    | "REGLEMENT"
    | "FICHE_PAIE",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any,
): Promise<Uint8Array> {
  switch (kind) {
    case "TRAVAIL":
      return generateContractTravailPdf(input);
    case "STAGE":
      return generateContractStagePdf(input);
    case "PRESTA":
      return generateContractPrestaPdf(input);
    case "ATTESTATION":
      return generateAttestationStagePdf(input);
    case "SOLDE":
      return generateSoldeToutComptePdf(input);
    case "REGLEMENT":
      return generateReglementInterieurPdf(input);
    case "FICHE_PAIE":
      return generateFichePaiePdf(input);
    default:
      throw new Error(`Gabarit RH inconnu: ${kind}`);
  }
}

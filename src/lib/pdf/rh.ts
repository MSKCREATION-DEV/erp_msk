/**
 * Gabarits PDF RH — charte MSK (logo, bleu #1D73BC, ink, pied légal).
 * Sources métier : contrats / attestation / solde / règlement / fiche paie MSK.
 */
import { readFile } from "fs/promises";
import path from "path";
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

const BLUE = rgb(29 / 255, 115 / 255, 188 / 255);
const INK = rgb(13 / 255, 19 / 255, 48 / 255);
const MUTED = rgb(100 / 255, 110 / 255, 130 / 135);
const LIGHT = rgb(0.9, 0.94, 0.98);
const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;

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

type Ctx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  fontOblique: PDFFont;
  width: number;
  height: number;
  y: number;
};

function draw(
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
  try {
    const bytes = await readFile(
      path.join(process.cwd(), "public/brand/lockup.png"),
    );
    return pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

async function createCtx(): Promise<Ctx> {
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

function ensureSpace(ctx: Ctx, needed: number) {
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

async function drawHeader(ctx: Ctx, title: string) {
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

function drawFooter(ctx: Ctx) {
  const footer1 = `Adresse : ${company.addressOneLine}`;
  const footer2 = `NIF : ${company.fiscalId}  ·  ${company.email}  ·  ${company.phones}`;
  const y1 = 28;
  const y2 = 16;
  const f1 = toWinAnsi(footer1);
  const f2 = toWinAnsi(footer2);
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
}

function drawParagraph(ctx: Ctx, text: string, size = 9.5, gap = 13) {
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

function drawTitle(ctx: Ctx, text: string) {
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

function employerIntro(): string {
  return (
    `La societe ${company.legalName}, societe a responsabilite limitee au capital de ${company.capital}, ` +
    `dont le siege social est situe a Bamako, ${company.addressOneLine}, immatriculee au Registre du Commerce ` +
    `et du Credit Mobilier (RCCM) sous le numero ${company.rccm}, representee par Monsieur ${company.managerName}, ` +
    `en sa qualite de ${company.managerTitle}, ci-apres denommee "l'Employeur" ou "la Societe", d'une part,`
  );
}

function personFullName(p: RhPersonInput) {
  const civ = p.civility ?? "M.";
  return `${civ} ${p.firstName} ${p.lastName}`;
}

async function drawSignatureBlock(
  ctx: Ctx,
  leftLabel: string,
  rightLabel: string,
  signaturePng?: Uint8Array | Buffer,
  signatureLabel?: string,
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
    `La duree hebdomadaire de travail sera de ${company.weeklyHours} heures, reparties du lundi au vendredi. ` +
    `Horaire type : lundi, mardi, jeudi, vendredi de 8h a 17h (pause 1h) ; mercredi de 8h a 17h (teletravail possible).`
  );
}

/** Contrat de travail (CDI/CDD) — structure alignée références MSK. */
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
    `${personFullName(input.employee)}${input.employee.birthDate ? `, ne(e) le ${input.employee.birthDate}` : ""}` +
      `${input.employee.address ? `, demeurant a ${input.employee.address}` : ""}` +
      `${input.employee.idCard ? `, titulaire de la piece d'identite n° ${input.employee.idCard}` : ""}.` +
      ` Ci-apres denomme(e) "le Salarie", d'autre part.`,
  );
  ctx.y -= 6;
  drawParagraph(ctx, "Il est convenu ce qui suit :");
  ctx.y -= 8;

  drawTitle(ctx, "Article 1 : Objet du contrat");
  drawParagraph(
    ctx,
    `Le salarie est recrute par la societe en qualite de ${input.employee.jobTitle ?? input.title} ` +
      `relevant de la grille interne de classification de ${company.legalName}. ` +
      `Ce poste s'inscrit dans le cadre des dispositions du Code du travail de la Republique du Mali.`,
  );

  drawTitle(ctx, "Article 2 : Lieu de travail");
  drawParagraph(
    ctx,
    `Le salarie exercera ses fonctions dans les locaux de ${company.legalName} situés a Bamako, ${company.addressOneLine}. ` +
      `En fonction des necessites de service, le salarie pourra etre amene a se deplacer.`,
  );

  drawTitle(ctx, "Article 3 : Date d'embauche");
  drawParagraph(
    ctx,
    `Le present contrat prend effet le ${input.startDate}` +
      (input.endDate
        ? ` et est conclu jusqu'au ${input.endDate}.`
        : ` et est conclu pour une duree indeterminee.`),
  );

  drawTitle(ctx, "Article 4 : Periode d'essai");
  drawParagraph(
    ctx,
    `Periode d'essai de ${input.trialMonths ?? 3} mois, reconduction possible d'1 mois avec accord ecrit. ` +
      `Delai de prevenance : 3 semaines pour chaque partie.`,
  );

  drawTitle(ctx, "Article 5 : Duree du travail");
  drawParagraph(ctx, workScheduleArticle());

  drawTitle(ctx, "Article 6 : Remuneration");
  drawParagraph(
    ctx,
    input.salaryXof
      ? `En contrepartie, le salarie percevra une remuneration mensuelle nette de ${formatMoneyFr(input.salaryXof)} ${company.currency}, ` +
        `versee a terme echu par virement ou tout mode autorise.`
      : `La remuneration est fixee d'un commun accord et precisee en annexe ou avenant.`,
  );

  drawTitle(ctx, "Article 7 : Confidentialite");
  drawParagraph(
    ctx,
    `Le salarie s'engage a conserver confidentiels, pendant le contrat et apres sa cessation, ` +
      `tous documents, informations, codes, donnees et secrets commerciaux dont il aurait connaissance.`,
  );

  if (input.notes) {
    drawTitle(ctx, "Article 8 : Dispositions particulieres");
    drawParagraph(ctx, input.notes);
  }

  ctx.y -= 8;
  drawParagraph(
    ctx,
    `Fait a Bamako, le ${formatDateFr()}, en deux exemplaires originaux.`,
  );
  await drawSignatureBlock(
    ctx,
    `Pour ${company.legalName}`,
    "Le Salarie",
    input.signaturePng,
    input.signatureLabel,
  );
  drawFooter(ctx);
  return ctx.pdf.save();
}

/** Contrat de stage professionnel. */
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
    `${personFullName(input.employee)}${input.employee.birthDate ? `, ne(e) le ${input.employee.birthDate}` : ""}` +
      `${input.employee.address ? `, demeurant a ${input.employee.address}` : ""}.` +
      ` Ci-apres denomme(e) "le/la Stagiaire", d'autre part.`,
  );
  ctx.y -= 6;
  drawParagraph(ctx, "Il est convenu ce qui suit :");
  ctx.y -= 8;

  drawTitle(ctx, "Article 1 : Objet");
  drawParagraph(
    ctx,
    `Le/la stagiaire est accueilli(e) en qualite de ${input.employee.jobTitle ?? "Stagiaire"} ` +
      `dans le cadre d'un stage professionnel au sein de ${company.legalName}.`,
  );

  drawTitle(ctx, "Article 2 : Lieu");
  drawParagraph(
    ctx,
    `Stage effectue a Bamako, ${company.addressOneLine}, sauf deplacements lies a la mission.`,
  );

  drawTitle(ctx, "Article 3 : Duree");
  drawParagraph(
    ctx,
    `Le stage prend effet le ${input.startDate}` +
      (input.endDate
        ? ` et s'acheve le ${input.endDate}.`
        : ` pour une duree determinee precisee par avenant.`),
  );

  drawTitle(ctx, "Article 4 : Horaires");
  drawParagraph(ctx, workScheduleArticle());

  drawTitle(ctx, "Article 5 : Gratification");
  drawParagraph(
    ctx,
    input.salaryXof
      ? `Gratification mensuelle nette de ${formatMoneyFr(input.salaryXof)} ${company.currency}, versee a terme echu.`
      : `La gratification eventuelle est precisee en annexe.`,
  );

  drawTitle(ctx, "Article 6 : Confidentialite & materiel");
  drawParagraph(
    ctx,
    `Le/la stagiaire respecte la confidentialite des informations MSK et utilise avec soin le materiel mis a disposition.`,
  );

  if (input.notes) {
    drawTitle(ctx, "Article 7 : Dispositions particulieres");
    drawParagraph(ctx, input.notes);
  }

  drawParagraph(
    ctx,
    `Fait a Bamako, le ${formatDateFr()}, en deux exemplaires.`,
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

/** Contrat de prestation de services. */
export async function generateContractPrestaPdf(
  input: RhContractPdfInput,
): Promise<Uint8Array> {
  const ctx = await createCtx();
  await drawHeader(ctx, "CONTRAT DE PRESTATION DE SERVICES");

  drawParagraph(ctx, employerIntro().replace('"l\'Employeur"', '"le Client"'));
  ctx.y -= 8;
  drawParagraph(ctx, "Et :");
  drawParagraph(
    ctx,
    `${personFullName(input.employee)}, intervenant en qualite de prestataire independant` +
      `${input.employee.jobTitle ? ` (${input.employee.jobTitle})` : ""}.` +
      ` Ci-apres denomme(e) "le Prestataire", d'autre part.`,
  );
  ctx.y -= 6;
  drawParagraph(ctx, "Il est convenu ce qui suit :");
  ctx.y -= 8;

  drawTitle(ctx, "Article 1 : Objet");
  drawParagraph(
    ctx,
    `Le Prestataire s'engage a realiser pour ${company.legalName} les prestations decrites : ${input.title}.`,
  );

  drawTitle(ctx, "Article 2 : Duree");
  drawParagraph(
    ctx,
    `Prestation a compter du ${input.startDate}` +
      (input.endDate ? ` jusqu'au ${input.endDate}.` : `.`),
  );

  drawTitle(ctx, "Article 3 : Remuneration");
  drawParagraph(
    ctx,
    input.salaryXof
      ? `Honoraires : ${formatMoneyFr(input.salaryXof)} ${company.currency} (hors taxes le cas echeant), selon modalites convenues.`
      : `Les honoraires sont precises en annexe.`,
  );

  drawTitle(ctx, "Article 4 : Independance");
  drawParagraph(
    ctx,
    `Le Prestataire reste independant ; le present contrat ne constitue ni un contrat de travail ni un lien de subordination.`,
  );

  drawTitle(ctx, "Article 5 : Confidentialite & PI");
  drawParagraph(
    ctx,
    `Confidentialite stricte. Les livrables realises pour MSK sont cedes a la Societe sauf accord contraire ecrit.`,
  );

  if (input.notes) {
    drawTitle(ctx, "Article 6 : Dispositions particulieres");
    drawParagraph(ctx, input.notes);
  }

  drawParagraph(ctx, `Fait a Bamako, le ${formatDateFr()}.`);
  await drawSignatureBlock(
    ctx,
    `Pour ${company.legalName}`,
    "Le Prestataire",
    input.signaturePng,
    input.signatureLabel,
  );
  drawFooter(ctx);
  return ctx.pdf.save();
}

/** Attestation de stage. */
export async function generateAttestationStagePdf(
  input: RhAttestationInput,
): Promise<Uint8Array> {
  const ctx = await createCtx();
  await drawHeader(ctx, "ATTESTATION DE STAGE");

  drawParagraph(
    ctx,
    `Je soussigne(e), ${company.managerName}, ${company.managerTitle} de ${company.legalName}, certifie que :`,
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
    `a effectue un stage de ${input.jobTitle} au sein de ${company.legalName}`,
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
    `La presente attestation est delivree pour servir et valoir ce que de droit.`,
  );
  ctx.y -= 8;
  drawParagraph(
    ctx,
    `Fait a Bamako, le ${input.issueDate ?? formatDateFr()}.`,
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

/** Solde de tout compte. */
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
    `Je soussigne(e) ${input.employee.firstName} ${input.employee.lastName}` +
      `${input.employee.address ? `, demeurant a ${input.employee.address}` : ""},`,
  );
  ctx.y -= 6;
  drawParagraph(
    ctx,
    `Reconnais avoir recu de l'entreprise ${company.legalName}` +
      (input.includeAttestation !== false
        ? ` mon attestation de fin de relation ainsi que, `
        : ` `) +
      `pour solde de tout compte, la somme de ${formatMoneyFr(input.amountXof)} ${company.currency}` +
      ` (${words})` +
      (input.paymentRef ? ` — reference ${input.paymentRef}` : "") +
      `.`,
  );
  ctx.y -= 8;
  drawParagraph(
    ctx,
    `Je reconnais avoir ete informe(e) des dispositions legales relatives au present recu pour solde de tout compte.`,
  );
  ctx.y -= 12;
  drawParagraph(
    ctx,
    `Fait a Bamako, le ${input.issueDate ?? formatDateFr()}.`,
  );
  ctx.y -= 20;
  draw(ctx.page, `${input.employee.firstName} ${input.employee.lastName}`, {
    x: MARGIN,
    y: ctx.y,
    size: 10,
    font: ctx.fontBold,
  });
  ctx.y -= 14;
  draw(ctx.page, 'Signature precedee de la mention « Bon pour solde de tout compte »', {
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

/** Accusé / extrait règlement intérieur (signature collab). */
export async function generateReglementInterieurPdf(
  input: RhReglementInput,
): Promise<Uint8Array> {
  const ctx = await createCtx();
  await drawHeader(ctx, "REGLEMENT INTERIEUR — ACCUSE DE RECEPTION");

  drawParagraph(
    ctx,
    `${company.legalName} met a disposition de ses collaborateurs un reglement interieur ` +
      `fixant les regles de vie collective, d'hygiene, de securite, de confidentialite et de discipline.`,
  );
  ctx.y -= 8;

  const articles = [
    {
      t: "1. Horaires & presence",
      b: `Horaire collectif ${company.weeklyHours} h / semaine. Retards et absences doivent etre signales sans delai.`,
    },
    {
      t: "2. Confidentialite",
      b: `Interdiction de divulguer informations clients, codes, fichiers et secrets commerciaux hors cadre professionnel.`,
    },
    {
      t: "3. Materiel & outils",
      b: `Le materiel MSK est utilise a des fins professionnelles. Toute perte ou degradation doit etre signalee.`,
    },
    {
      t: "4. Conduite & respect",
      b: `Respect mutuel, non-discrimination, professionnalisme aupres des clients et partenaires.`,
    },
    {
      t: "5. Sanctions",
      b: `Tout manquement peut donner lieu a un avertissement, une mise a pied ou une rupture selon le Code du travail.`,
    },
  ];
  for (const a of articles) {
    drawTitle(ctx, a.t);
    drawParagraph(ctx, a.b);
  }

  ctx.y -= 10;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 56,
    width: ctx.width - MARGIN * 2,
    height: 64,
    color: LIGHT,
  });
  draw(
    ctx.page,
    `Je soussigne(e) ${input.employee.firstName} ${input.employee.lastName}, ` +
      `reconnais avoir pris connaissance du reglement interieur de ${company.legalName} ` +
      `et m'engage a le respecter.`,
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

/** Fiche de paie simplifiée (aperçu Phase 5 — cotisations indicatives Mali). */
export async function generateFichePaiePdf(
  input: RhPayslipInput,
): Promise<Uint8Array> {
  const ctx = await createCtx();
  await drawHeader(ctx, "BULLETIN DE SALAIRE");

  const net = input.netSalaryXof ?? input.baseSalaryXof;
  const base = input.baseSalaryXof;

  // Infos employé
  const leftX = MARGIN;
  const rightX = ctx.width / 2 + 8;
  const rows: [string, string, string, string][] = [
    [
      "Nom",
      `${input.employee.lastName} ${input.employee.firstName}`,
      "Salaire contractuel",
      `${formatMoneyFr(base)} ${company.currency}`,
    ],
    [
      "E-mail",
      input.employee.email ?? "—",
      "Periode",
      `${input.periodStart} - ${input.periodEnd}`,
    ],
    [
      "Fonction",
      input.employee.jobTitle ?? "—",
      "Calcule le",
      input.computedAt ?? formatDateFr(),
    ],
    [
      "Contrat",
      input.contractTypeLabel ?? "Temps plein",
      "Horaire",
      `${company.weeklyHours} h / semaine`,
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

  // Table cotisations (indicatif)
  const cotis = [
    { label: "Accident de Travail", rate: 0.02 },
    { label: "Prestations Familiales", rate: 0.08 },
    { label: "Retraite", rate: 0.07 },
    { label: "Invalidite", rate: 0.02 },
    { label: "ANPE", rate: 0.01 },
    { label: "AMO (employeur)", rate: 0.035 },
    { label: "AMO (employe)", rate: 0.0306 },
  ];
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

  draw(ctx.page, "Salaire de base", {
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
  draw(ctx.page, "Net a payer", {
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
    `Conges payes : solde ${leaveBal} j · pris ${leaveTaken} j · restants ${Math.max(leaveBal - leaveTaken, 0)} j.`,
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

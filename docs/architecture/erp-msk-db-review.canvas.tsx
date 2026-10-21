import {
  Card,
  CardBody,
  CardHeader,
  Callout,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  useHostTheme,
  BarChart,
  computeDAGLayout,
} from "cursor/canvas";

/**
 * Revue BD ERP MSK — inventaire, liaisons, candidats nettoyage.
 * Source: prisma/schema.prisma + counts exacts public (2026-10-21).
 */

type DomainId =
  | "iam"
  | "ged"
  | "crm"
  | "com"
  | "cpt"
  | "rh"
  | "stk"
  | "pat"
  | "prj"
  | "ops";

const DOMAINS: {
  id: DomainId;
  label: string;
  tables: number;
  rows: number;
  note: string;
}[] = [
  { id: "iam", label: "IAM / Auth app", tables: 10, rows: 694, note: "Users, packs, groups, audit" },
  { id: "ged", label: "GED / Org", tables: 8, rows: 197, note: "Folders, docs, templates, org chart" },
  { id: "crm", label: "CRM Commercial", tables: 13, rows: 2225, note: "Cœur data — 333 orgs/deals" },
  { id: "com", label: "Devis / Factures", tables: 7, rows: 9, note: "Pipeline COM naissant" },
  { id: "cpt", label: "Compta / Budget", tables: 12, rows: 131, note: "Plan + écritures + budget" },
  { id: "rh", label: "RH / Paie", tables: 13, rows: 59, note: "Employés, contrats, paie" },
  { id: "stk", label: "Stocks", tables: 4, rows: 16, note: "Articles + mouvements" },
  { id: "pat", label: "Patrimoine", tables: 1, rows: 0, note: "Scaffold vide" },
  { id: "prj", label: "Projets", tables: 3, rows: 0, note: "Scaffold vide" },
  { id: "ops", label: "Anomalies", tables: 1, rows: 0, note: "Scaffold vide" },
];

const HEAVY = [
  { table: "crm_contact_channels", n: 367, domain: "CRM" },
  { table: "crm_organizations", n: 333, domain: "CRM" },
  { table: "crm_contacts", n: 333, domain: "CRM" },
  { table: "crm_opportunities", n: 333, domain: "CRM" },
  { table: "crm_activities", n: 325, domain: "CRM" },
  { table: "pack_permissions", n: 280, domain: "IAM" },
  { table: "audit_logs", n: 260, domain: "IAM" },
  { table: "crm_tasks", n: 190, domain: "CRM" },
  { table: "permissions", n: 108, domain: "IAM" },
  { table: "document_folders", n: 93, domain: "GED" },
];

const EMPTY = [
  { table: "document_acls", verdict: "Orpheline code", action: "Candidat drop (0 usage src)" },
  { table: "user_permission_overrides", verdict: "Feature morte", action: "Garder schéma ou drop si jamais UI" },
  { table: "password_reset_requests", verdict: "Peu utilisée", action: "Vérifier flux Auth admin" },
  { table: "crm_opportunity_offers", verdict: "Doublon potentiel", action: "vs catalogOfferId sur deal" },
  { table: "crm_weekly_reports", verdict: "Vide + upsert code", action: "Garder si rapport métier prévu" },
  { table: "crm_period_goals", verdict: "Vide mais UI Objectifs", action: "Garder — feature active" },
  { table: "crm_assignment_requests", verdict: "Vide + UI Affectations", action: "Garder" },
  { table: "com_invoices / lines / payments", verdict: "Module pas peuplé", action: "Garder — COM à venir" },
  { table: "prj_* / pat_assets / ops_tickets", verdict: "Scaffolds phase", action: "Garder ou archiver modules" },
  { table: "rh_timesheets*", verdict: "Module heures vide", action: "Garder si roadmap RH" },
  { table: "stk_purchases*", verdict: "Achats non utilisés", action: "Garder ou fusionner mouvements" },
  { table: "bud_lines", verdict: "Budget sans lignes", action: "Garder — exercice existe" },
];

const RELATIONS = [
  {
    from: "User",
    to: "~40 relations",
    how: "Hub central (owner/creator/assignee partout)",
    risk: "Couplage fort — normal ERP single-tenant",
  },
  {
    from: "CrmOrganization",
    to: "CrmContact → CrmContactChannel",
    how: "1 org · N contacts · N canaux",
    risk: "phone/email aussi sur Contact (doublon legacy)",
  },
  {
    from: "CrmOrganization",
    to: "CrmOpportunity",
    how: "1 org · N deals (souvent 1:1 import)",
    risk: "title = orgName souvent redondant",
  },
  {
    from: "CrmOpportunity",
    to: "CrmActivity / CrmTask",
    how: "Timeline + file relances",
    risk: "OK — cœur opérationnel",
  },
  {
    from: "CrmOpportunity",
    to: "ComClient / ComQuote",
    how: "Conversion gagné → dossier client",
    risk: "Duplication champs entreprise",
  },
  {
    from: "CrmOpportunity",
    to: "CatalogOffer",
    how: "FK directe + table M2M opportunity_offers",
    risk: "Deux modèles d’attache offre",
  },
  {
    from: "DocumentFolder / Document",
    to: "DocumentLink / DocumentAcl",
    how: "GED + liens polymorphiques",
    risk: "ACL jamais peuplée (0 rows, 0 code)",
  },
  {
    from: "RhEmployee",
    to: "User?",
    how: "Lien optionnel userId",
    risk: "RH ≠ Auth — volontaire",
  },
  {
    from: "RhContract / RhPayslip",
    to: "GED",
    how: "gedDocumentId String soft",
    risk: "Pas de FK Prisma — orphelins possibles",
  },
  {
    from: "ComInvoice",
    to: "CptEntry",
    how: "Lien compta soft / lookup",
    risk: "À durcir en FK si COM mature",
  },
];

const ACCESS = [
  { path: "Next.js Server · Prisma", role: "Unique accès métier", status: "OK" },
  { path: "requireUser + RBAC packs", role: "Autorisation app", status: "OK" },
  { path: "Supabase Auth", role: "Session / MDP", status: "OK" },
  { path: "PostgREST anon", role: "Bloqué (RLS sans policy)", status: "Sécurisé" },
];

const CLEANUP_TIERS = [
  {
    tier: "A — Quick wins (faible risque)",
    items: [
      "document_acls : 0 rows + 0 usage code → drop modèle + migration",
      "Clarifier CrmContact.phone/email vs crm_contact_channels (source de vérité = channels)",
      "Documenter soft FKs (gedDocumentId) ou ajouter relations optionnelles",
    ],
  },
  {
    tier: "B — Conception (moyen)",
    items: [
      "Choisir 1 modèle offre deal : catalogOfferId OU crm_opportunity_offers",
      "ComClient : ne garder que le delta vs CrmOrganization (éviter miroir)",
      "CrmOpportunity.title redondant avec org.name — règle métier explicite",
    ],
  },
  {
    tier: "C — Modules vides (produit)",
    items: [
      "prj_* / pat_assets / ops_tickets : garder si roadmap 2026, sinon geler UI",
      "stk_purchases : utile vs mouvements seuls ?",
      "rh_timesheets : activer parcours ou masquer menu",
    ],
  },
  {
    tier: "D — Ne pas toucher maintenant",
    items: [
      "IAM (permissions / packs) — fondation",
      "CRM orgs/contacts/deals/tasks/activities — data importée",
      "cpt_* plan + écritures — compta live",
      "crm_period_goals / assignment_requests — UI active même si 0 rows",
    ],
  },
];

export default function ErpMskDbReview() {
  const theme = useHostTheme();

  const NODE_W = 128;
  const NODE_H = 36;
  const nodeLabels: Record<string, string> = {
    user: "User",
    org: "CrmOrganization",
    contact: "CrmContact",
    channel: "ContactChannel",
    deal: "CrmOpportunity",
    act: "Activity",
    task: "Task",
    client: "ComClient",
    quote: "ComQuote",
    inv: "ComInvoice",
    ged: "Document",
  };
  const dag = computeDAGLayout({
    nodes: Object.keys(nodeLabels).map((id) => ({ id })),
    edges: [
      { from: "user", to: "org" },
      { from: "org", to: "contact" },
      { from: "contact", to: "channel" },
      { from: "org", to: "deal" },
      { from: "user", to: "deal" },
      { from: "deal", to: "act" },
      { from: "deal", to: "task" },
      { from: "deal", to: "client" },
      { from: "client", to: "quote" },
      { from: "quote", to: "inv" },
      { from: "client", to: "ged" },
    ],
    direction: "horizontal",
    nodeWidth: NODE_W,
    nodeHeight: NODE_H,
    rankGap: 56,
    nodeGap: 16,
  });

  return (
    <Stack gap={24} style={{ padding: 24, maxWidth: 1100 }}>
      <Stack gap={8}>
        <H1>Revue base de données — ERP MSK</H1>
        <Text tone="secondary">
          Analyse expert (schéma Prisma + volumes exacts + usage code). Objectif :
          carte claire puis plan de nettoyage — aucune suppression exécutée ici.
        </Text>
        <Text tone="tertiary" size="small">
          Source : prisma/schema.prisma · counts public 2026-10-21 · rg prisma.* dans
          src/
        </Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value="71" label="Tables métier" />
        <Stat value="~3,3k" label="Lignes totales (approx.)" />
        <Stat value="20" label="Tables vides (0 row)" tone="warning" />
        <Stat value="1" label="Orpheline code (ACL)" tone="danger" />
      </Grid>

      <Callout tone="info" title="Verdict architecture">
        Schéma ERP classique single-tenant : hub User + domaines par préfixe. Le CRM
        concentre ~70 % des lignes (import). Beaucoup de tables vides = modules
        scaffoldés (phases), pas forcément « inutiles ». Le vrai gras : doublons de
        modèle (contact channels, offres deal, miroir ComClient) et document_acls
        jamais branché.
      </Callout>

      <H2>Volumes par domaine</H2>
      <BarChart
        categories={DOMAINS.map((d) => d.label)}
        series={[
          {
            name: "Lignes (approx.)",
            data: DOMAINS.map((d) => d.rows),
            tone: "info",
          },
        ]}
        height={220}
      />
      <Table
        headers={["Domaine", "Tables", "Lignes", "Note"]}
        rows={DOMAINS.map((d) => [
          d.label,
          String(d.tables),
          String(d.rows),
          d.note,
        ])}
      />

      <H2>Top tables (données réelles)</H2>
      <Table
        headers={["Table", "Rows", "Domaine"]}
        rows={HEAVY.map((h) => [h.table, String(h.n), h.domain])}
      />

      <H2>Chaîne métier cœur (CRM → COM → GED)</H2>
      <Text tone="secondary" size="small">
        Lecture gauche → droite : ownership User, org/contact/deal, puis conversion
        client / devis / facture, documents.
      </Text>
      <Card>
        <CardBody>
          <svg
            width={dag.width}
            height={dag.height}
            style={{ maxWidth: "100%", overflow: "visible" }}
          >
            {dag.edges.map((e) => (
              <line
                key={`${e.from}-${e.to}`}
                x1={e.sourceX}
                y1={e.sourceY}
                x2={e.targetX}
                y2={e.targetY}
                stroke={theme.stroke.secondary}
                strokeWidth={1.5}
              />
            ))}
            {dag.nodes.map((n) => (
              <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  fill={theme.bg.elevated}
                  stroke={theme.stroke.primary}
                />
                <text
                  x={NODE_W / 2}
                  y={NODE_H / 2 + 4}
                  textAnchor="middle"
                  fill={theme.text.primary}
                  fontSize={11}
                  fontFamily="system-ui, sans-serif"
                >
                  {nodeLabels[n.id]}
                </text>
              </g>
            ))}
          </svg>
        </CardBody>
      </Card>

      <H2>Liaisons critiques & risques</H2>
      <Table
        headers={["De", "Vers", "Comment c’est pris", "Risque / dette"]}
        rows={RELATIONS.map((r) => [r.from, r.to, r.how, r.risk])}
      />

      <H2>Comment l’app lit les données</H2>
      <Table
        headers={["Chemin", "Rôle", "Statut"]}
        rows={ACCESS.map((a) => [
          a.path,
          a.role,
          a.status === "OK" || a.status === "Sécurisé" ? (
            <Pill tone="success" key={a.path}>
              {a.status}
            </Pill>
          ) : (
            a.status
          ),
        ])}
      />
      <Callout tone="success" title="Pas de changement de coding path">
        Prisma serveur + RBAC restent la seule voie métier. Le nettoyage ciblera le
        schéma / doublons, pas un rewrite d’accès.
      </Callout>

      <H2>Tables vides & candidats nettoyage</H2>
      <Table
        headers={["Table / groupe", "Verdict", "Action proposée"]}
        rows={EMPTY.map((e) => [e.table, e.verdict, e.action])}
      />

      <Divider />

      <H2>Plan de nettoyage (préparation)</H2>
      <Stack gap={16}>
        {CLEANUP_TIERS.map((t) => (
          <Card key={t.tier}>
            <CardHeader>
              <H3>{t.tier}</H3>
            </CardHeader>
            <CardBody>
              <Stack gap={6}>
                {t.items.map((item) => (
                  <Text key={item} size="small">
                    • {item}
                  </Text>
                ))}
              </Stack>
            </CardBody>
          </Card>
        ))}
      </Stack>

      <H2>Cartographie tables (71)</H2>
      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>
            <Row gap={8} align="center">
              <H3>IAM</H3>
              <Pill tone="neutral">actif</Pill>
            </Row>
          </CardHeader>
          <CardBody>
            <Text size="small">
              organization_settings · users · groups · group_members · permissions ·
              permission_packs · pack_permissions · user_packs ·
              user_permission_overrides(0) · audit_logs · password_reset_requests(0)
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <Row gap={8} align="center">
              <H3>GED / Org</H3>
              <Pill tone="neutral">actif</Pill>
            </Row>
          </CardHeader>
          <CardBody>
            <Text size="small">
              document_folders · documents · document_links · document_acls(0
              orpheline) · brand_assets · signature_assets · org_nodes ·
              document_templates
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <Row gap={8} align="center">
              <H3>CRM</H3>
              <Pill tone="success">lourd</Pill>
            </Row>
          </CardHeader>
          <CardBody>
            <Text size="small">
              catalog_offers · crm_organizations · crm_contacts ·
              crm_contact_channels · crm_opportunities · crm_activities · crm_tasks
              · crm_scripts · crm_period_goals(0) · crm_weekly_reports(0) ·
              crm_opportunity_offers(0) · crm_assignment_requests(0)
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <Row gap={8} align="center">
              <H3>COM</H3>
              <Pill tone="warning">naissant</Pill>
            </Row>
          </CardHeader>
          <CardBody>
            <Text size="small">
              com_number_sequences · com_clients · com_quotes · com_quote_lines ·
              com_invoices(0) · com_invoice_lines(0) · com_payments(0)
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <H3>Compta / Budget</H3>
          </CardHeader>
          <CardBody>
            <Text size="small">
              cpt_accounts · journals · exercises · periods · entries · entry_lines ·
              bank_accounts · bank_txns · fx_rates · bud_exercises · bud_lines(0) ·
              bud_patente_dues
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <H3>RH / Paie</H3>
          </CardHeader>
          <CardBody>
            <Text size="small">
              rh_employees · contracts · leave_requests · absences · timesheets(0) ·
              timesheet_lines(0) · inps_settings · payroll_periods · payslips ·
              payslip_lines · inps_lines · contract_type_rules
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <Row gap={8} align="center">
              <H3>Stocks / Pat / Prj / Ops</H3>
              <Pill tone="warning">mixte</Pill>
            </Row>
          </CardHeader>
          <CardBody>
            <Text size="small">
              stk_articles · movements · purchases(0) · purchase_lines(0) ·
              pat_assets(0) · prj_projects(0) · members(0) · expenses(0) ·
              ops_tickets(0)
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <Callout tone="warning" title="Prochaine étape (avec toi)">
        Valider le tier A (document_acls + règle channels) puis B (offres / ComClient).
        On n’exécute le drop qu’après ton OK explicite table par table.
      </Callout>
    </Stack>
  );
}

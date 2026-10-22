import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — RTCMO Padel",
  description:
    "Conditions générales d'utilisation du site de réservation de padel du Royal Tennis Club de Mohammédia : réservation, paiement en ligne sécurisé CMI, annulation, remboursement et protection des données personnelles.",
};

/**
 * ⚠️ PROJET DE CGU — à faire valider par un conseil juridique avant publication.
 * Les champs « [À COMPLÉTER] » doivent être renseignés (identité légale du club,
 * RC / ICE, adresse, déclaration CNDP, etc.).
 */
const LAST_UPDATE = "20 octobre 2026";

const CLUB = {
  name: "Royal Tennis Club de Mohammédia (RTCMO)",
  legalForm: "[À COMPLÉTER — ex. association sportive]",
  address: "[À COMPLÉTER — adresse du siège, Mohammédia, Maroc]",
  registration: "[À COMPLÉTER — RC / ICE / IF]",
  email: "rtcmo2026@gmail.com",
  phone: "+212 6 68 70 52 31",
};

type Section = { id: string; title: string; body: React.ReactNode };

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ marginBottom: "var(--space-2)" }}>{children}</p>
);
const UL = ({ items }: { items: React.ReactNode[] }) => (
  <ul style={{ paddingLeft: "1.25rem", marginBottom: "var(--space-2)", display: "grid", gap: "6px" }}>
    {items.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </ul>
);

const h3 = {
  fontSize: "1rem",
  fontWeight: 700,
  color: "var(--primary)",
  margin: "var(--space-3) 0 var(--space-1)",
} as const;

const sections: Section[] = [
  {
    id: "objet",
    title: "1. Objet et champ d'application",
    body: (
      <>
        <P>
          Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'accès et l'utilisation du site de
          réservation de terrains de padel du {CLUB.name} (le « Club ») ainsi que la réservation et le paiement
          en ligne de créneaux (les « Services »).
        </P>
        <P>
          Toute création de compte, réservation ou paiement implique l'acceptation pleine et entière des CGU. Si
          vous êtes en désaccord avec l'une de leurs dispositions, vous devez vous abstenir d'utiliser les Services.
        </P>
      </>
    ),
  },
  {
    id: "editeur",
    title: "2. Identification de l'exploitant",
    body: (
      <UL
        items={[
          <>Dénomination : {CLUB.name}</>,
          <>Forme juridique : {CLUB.legalForm}</>,
          <>Siège : {CLUB.address}</>,
          <>Immatriculation : {CLUB.registration}</>,
          <>
            E-mail : <a href={`mailto:${CLUB.email}`}>{CLUB.email}</a> — Téléphone : {CLUB.phone}
          </>,
        ]}
      />
    ),
  },
  {
    id: "definitions",
    title: "3. Définitions",
    body: (
      <UL
        items={[
          <><strong>Utilisateur / Client</strong> : toute personne physique majeure qui utilise le site ou effectue une réservation.</>,
          <><strong>Réservation</strong> : la réservation d'un terrain pour un créneau de 90 minutes à une date donnée.</>,
          <><strong>Référence</strong> : identifiant unique de la forme « RTM-XXXXXX » délivré à la confirmation.</>,
          <><strong>Prestataire de paiement</strong> : le Centre Monétique Interbancaire (« CMI »), qui exploite la passerelle de paiement sécurisée.</>,
        ]}
      />
    ),
  },
  {
    id: "compte",
    title: "4. Compte utilisateur",
    body: (
      <>
        <P>
          Pour réserver, l'Utilisateur crée un compte avec son nom, son numéro de téléphone, son adresse e-mail et
          un mot de passe. Il garantit l'exactitude et l'actualité de ces informations.
        </P>
        <P>
          L'Utilisateur est seul responsable de la confidentialité de ses identifiants et de toute activité réalisée
          depuis son compte. Toute suspicion d'utilisation frauduleuse doit être signalée sans délai au Club.
        </P>
        <P>
          Le Club se réserve le droit de suspendre ou supprimer un compte en cas d'informations fausses, d'abus
          (réservations fictives, blocage de créneaux), de fraude ou de non-respect des CGU. Les mineurs doivent
          être représentés par leur représentant légal pour toute réservation.
        </P>
      </>
    ),
  },
  {
    id: "reservation",
    title: "5. Réservation",
    body: (
      <>
        <UL
          items={[
            <>Le Club dispose de 3 terrains (deux couverts, un extérieur) ; les créneaux durent 90 minutes, de 08h00 à 23h00.</>,
            <>La réservation porte sur un terrain (et non par joueur) pour 2 ou 4 joueurs.</>,
            <>Le créneau est attribué selon le principe « premier arrivé, premier servi » et n'est garanti qu'à la confirmation de la Réservation (et, le cas échéant, du paiement).</>,
            <>Le Club peut annuler ou déplacer un créneau pour des raisons de force majeure, de sécurité, de maintenance, d'événement sportif ou d'intempéries (terrain extérieur) ; l'Utilisateur est alors remboursé intégralement ou se voit proposer un autre créneau.</>,
          ]}
        />
        <P>
          Une confirmation s'affiche à l'écran avec la Référence. L'Utilisateur doit la conserver : elle est
          nécessaire pour gérer sa réservation.
        </P>
      </>
    ),
  },
  {
    id: "prix",
    title: "6. Tarifs",
    body: (
      <>
        <P>
          Les prix sont exprimés en dirhams marocains (MAD), toutes taxes comprises, <strong>par terrain et par
          créneau de 90 minutes</strong> : 200 MAD en semaine (du lundi au vendredi) et 240 MAD le samedi et le
          dimanche. Le prix applicable est celui affiché au moment de la confirmation de la Réservation.
        </P>
        <P>
          Le Club peut modifier ses tarifs à tout moment ; les Réservations déjà confirmées ne sont pas affectées.
        </P>
      </>
    ),
  },
  {
    id: "paiement",
    title: "7. Paiement en ligne",
    body: (
      <>
        <P>
          Le paiement des Réservations s'effectue en ligne, en dirhams marocains, par carte bancaire (cartes
          bancaires marocaines et cartes internationales Visa / Mastercard acceptées par le CMI), via la
          plateforme de paiement sécurisée du CMI. Le paiement à l'accueil du Club peut rester disponible si le
          Club l'indique expressément lors de la Réservation.
        </P>
        <UL
          items={[
            <><strong>Exigibilité</strong> : le prix total est débité au moment de la validation du paiement.</>,
            <><strong>Sécurité</strong> : la saisie des données bancaires se fait exclusivement sur les pages du CMI, protégées par chiffrement (TLS) et authentification forte 3-D Secure. <strong>Le Club n'a jamais accès au numéro complet de votre carte, à sa date d'expiration ni à son cryptogramme, et ne les conserve pas.</strong></>,
            <><strong>Confirmation</strong> : la Réservation est confirmée et le statut « payé » attribué uniquement après autorisation du paiement par la banque émettrice. En cas de refus ou d'abandon, le créneau n'est pas garanti et peut être libéré après un délai de mise en attente.</>,
            <><strong>Preuve</strong> : les enregistrements informatiques du Club et du CMI font foi de la transaction, sauf preuve contraire.</>,
            <><strong>Fraude</strong> : le Club peut annuler une Réservation en cas de suspicion de fraude ou d'utilisation non autorisée d'un moyen de paiement, et transmettre les informations nécessaires aux autorités ou à la banque concernée.</>,
            <><strong>Incident technique</strong> : en cas de débit sans confirmation de Réservation, l'Utilisateur contacte le Club en indiquant la date, l'heure et le montant ; après vérification, la Réservation est confirmée ou le montant remboursé.</>,
          ]}
        />
      </>
    ),
  },
  {
    id: "annulation",
    title: "8. Annulation, modification et remboursement",
    body: (
      <>
        <UL
          items={[
            <><strong>Annulation par l'Utilisateur</strong> : possible depuis le site (« Gérer ma réservation » ou « Espace Joueur ») jusqu'à <strong>2 heures avant</strong> le début du créneau (heure du Maroc). Passé ce délai, aucune annulation n'est possible et la Réservation reste due.</>,
            <><strong>Remboursement</strong> : une Réservation payée en ligne et annulée dans les délais est remboursée <strong>intégralement</strong>, sur la carte utilisée pour le paiement, sans frais. Le délai d'affichage du crédit dépend de la banque émettrice et peut atteindre [À COMPLÉTER — ex. 10] jours ouvrés après la demande.</>,
            <><strong>Absence (no-show) ou annulation tardive</strong> : aucun remboursement.</>,
            <><strong>Annulation par le Club</strong> : remboursement intégral ou proposition d'un autre créneau (voir article 5).</>,
            <><strong>Intempéries</strong> : pour le terrain extérieur, le Club peut proposer un report ou un remboursement si le jeu est impossible.</>,
            <><strong>Droit de rétractation</strong> : s'agissant d'une prestation de loisirs à date et horaire déterminés, l'Utilisateur ne bénéficie pas du délai de rétractation, conformément à la législation applicable en matière de protection du consommateur (loi n° 31-08). [À VALIDER PAR LE CONSEIL JURIDIQUE]</>,
          ]}
        />
      </>
    ),
  },
  {
    id: "obligations",
    title: "9. Obligations de l'Utilisateur et règles d'usage",
    body: (
      <UL
        items={[
          <>Fournir des informations exactes et utiliser uniquement un moyen de paiement dont il est titulaire ou dont il est autorisé à se servir.</>,
          <>Respecter le règlement intérieur du Club, les horaires, les consignes de sécurité et le matériel (tenue et chaussures adaptées).</>,
          <>S'abstenir de toute réservation fictive, de toute tentative d'accès non autorisé au site, d'extraction automatisée de données ou de perturbation du service.</>,
          <>Le Club décline toute responsabilité pour les accidents corporels ou la perte d'objets personnels survenus dans l'enceinte du Club, sauf faute prouvée de sa part. Il est recommandé de disposer d'une assurance individuelle.</>,
        ]}
      />
    ),
  },
  {
    id: "donnees",
    title: "10. Protection des données personnelles",
    body: (
      <>
        <P>
          Le Club traite les données personnelles conformément à la loi n° 09-08 relative à la protection des
          personnes physiques à l'égard du traitement des données à caractère personnel et à ses textes
          d'application. Le Club est le responsable du traitement. [À COMPLÉTER — numéro de déclaration ou
          d'autorisation de la Commission Nationale de contrôle de la protection des Données à caractère
          Personnel (CNDP)]
        </P>

        <h3 style={h3}>10.1 Données collectées</h3>
        <UL
          items={[
            <><strong>Identité et contact</strong> : nom complet, numéro de téléphone, adresse e-mail.</>,
            <><strong>Compte</strong> : identifiants de connexion ; le mot de passe est stocké sous forme chiffrée (haché) et n'est jamais lisible par le Club.</>,
            <><strong>Réservation</strong> : terrain, date, créneau, nombre de joueurs, noms facultatifs des partenaires de jeu, référence, statut, montant.</>,
            <><strong>Paiement</strong> : identifiant et statut de la transaction, montant, date, code de réponse de la banque. <strong>Aucune donnée complète de carte bancaire n'est collectée ni conservée par le Club</strong> ; elles sont traitées exclusivement par le CMI et les établissements bancaires.</>,
            <><strong>Données techniques</strong> : adresse IP, type d'appareil et de navigateur, journaux de connexion, à des fins de sécurité et de prévention de la fraude.</>,
          ]}
        />
        <P>
          Les noms des partenaires de jeu sont saisis sous la responsabilité de l'Utilisateur, qui déclare être
          autorisé à les communiquer.
        </P>

        <h3 style={h3}>10.2 Finalités et bases légales</h3>
        <UL
          items={[
            <>Création et gestion du compte, gestion des Réservations, des annulations et de l'accueil au Club (exécution du contrat).</>,
            <>Encaissement, remboursement, gestion des litiges et lutte contre la fraude (exécution du contrat, intérêt légitime, obligations légales et comptables).</>,
            <>Sécurité du site et prévention des abus (intérêt légitime).</>,
            <>Communications liées au service (confirmation, rappel, modification). Les communications promotionnelles ne sont envoyées qu'avec le consentement préalable de l'Utilisateur.</>,
          ]}
        />

        <h3 style={h3}>10.3 Destinataires</h3>
        <P>Les données sont accessibles uniquement aux personnes habilitées du Club et aux sous-traitants strictement nécessaires :</P>
        <UL
          items={[
            <><strong>CMI</strong> et les banques concernées, pour le traitement des paiements ;</>,
            <><strong>Supabase</strong> (hébergement de la base de données et de l'authentification) et <strong>Vercel</strong> (hébergement du site), qui peuvent traiter des données en dehors du Maroc ;</>,
            <>les autorités judiciaires, administratives ou fiscales lorsque la loi l'exige.</>,
          ]}
        />
        <P>
          Les données ne sont ni vendues ni cédées à des tiers à des fins commerciales. Tout transfert vers
          l'étranger est réalisé dans le respect de la loi n° 09-08 et, le cas échéant, de l'autorisation de la CNDP.
        </P>

        <h3 style={h3}>10.4 Durée de conservation</h3>
        <UL
          items={[
            <>Données de compte : jusqu'à la suppression du compte, ou après [À COMPLÉTER — ex. 3 ans] d'inactivité.</>,
            <>Données de réservation et de transaction : [À COMPLÉTER — ex. 10 ans] pour les pièces comptables, conformément aux obligations légales.</>,
            <>Journaux techniques : [À COMPLÉTER — ex. 12 mois] maximum.</>,
          ]}
        />

        <h3 style={h3}>10.5 Droits de l'Utilisateur</h3>
        <P>
          Conformément à la loi n° 09-08, l'Utilisateur dispose d'un droit d'accès, de rectification, d'opposition
          pour motif légitime et de suppression de ses données, ainsi que du droit de s'opposer à toute prospection
          commerciale. Pour les exercer, il écrit à <a href={`mailto:${CLUB.email}`}>{CLUB.email}</a> en joignant
          un justificatif d'identité ; une réponse est apportée dans un délai raisonnable. Certaines données
          (transactions) peuvent devoir être conservées au titre d'obligations légales. L'Utilisateur peut
          également saisir la CNDP.
        </P>

        <h3 style={h3}>10.6 Sécurité</h3>
        <P>
          Le Club met en œuvre des mesures techniques et organisationnelles raisonnables : connexions chiffrées
          (HTTPS), accès restreint aux données, mots de passe hachés, séparation des clés d'accès. Aucune
          méthode n'étant infaillible, le Club informera les personnes concernées et l'autorité compétente en cas
          de violation de données, dans les conditions prévues par la loi.
        </P>

        <h3 style={h3}>10.7 Cookies</h3>
        <P>
          Le site utilise uniquement le stockage local strictement nécessaire à son fonctionnement (session de
          connexion). Aucun cookie publicitaire n'est déposé. [À ADAPTER si des outils de mesure d'audience sont ajoutés]
        </P>
      </>
    ),
  },
  {
    id: "pi",
    title: "11. Propriété intellectuelle",
    body: (
      <P>
        La marque, le logo, les textes, les images et l'ensemble des éléments du site sont la propriété du Club
        ou de ses partenaires. Toute reproduction ou exploitation sans autorisation écrite préalable est interdite.
      </P>
    ),
  },
  {
    id: "responsabilite",
    title: "12. Responsabilité et disponibilité du service",
    body: (
      <>
        <P>
          Le Club s'efforce d'assurer l'accès au site 24h/24 mais ne garantit pas l'absence d'interruption
          (maintenance, panne, incident chez un prestataire ou un opérateur). Il ne saurait être tenu responsable
          des dommages indirects, ni des dysfonctionnements liés à l'équipement de l'Utilisateur, à sa connexion
          ou aux services de sa banque.
        </P>
        <P>
          Le Club n'est pas responsable des services fournis par le CMI ou les banques, mais assiste l'Utilisateur
          dans ses démarches en cas de difficulté de paiement.
        </P>
      </>
    ),
  },
  {
    id: "reclamations",
    title: "13. Réclamations et contact",
    body: (
      <P>
        Toute réclamation peut être adressée à <a href={`mailto:${CLUB.email}`}>{CLUB.email}</a> ou par téléphone
        au {CLUB.phone}, en indiquant la Référence de la Réservation. Le Club s'engage à répondre dans les meilleurs
        délais. À défaut de solution amiable, le litige pourra être porté devant les juridictions compétentes.
      </P>
    ),
  },
  {
    id: "droit",
    title: "14. Droit applicable, juridiction et évolution des CGU",
    body: (
      <>
        <P>
          Les CGU sont soumises au droit marocain. En cas de litige, et à défaut d'accord amiable, les tribunaux
          compétents de [À COMPLÉTER — ex. Mohammédia / Casablanca] sont seuls compétents, sous réserve des
          règles impératives applicables aux consommateurs.
        </P>
        <P>
          Le Club peut modifier les CGU à tout moment ; la version applicable est celle en ligne au moment de la
          Réservation. La date de dernière mise à jour figure en tête de page.
        </P>
      </>
    ),
  },
];

export default function CguPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", padding: "var(--space-4) var(--space-3)" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)", gap: "12px", flexWrap: "wrap" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <Image src="/logo_nobg.png" alt="RTCMO" width={44} height={44} style={{ objectFit: "contain" }} />
            <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "1.1rem" }}>RTCMO Padel</span>
          </Link>
          <Link href="/" className="btn-back" style={{ textDecoration: "none" }}>
            ← Retour à la réservation
          </Link>
        </header>

        <main className="glass-panel" style={{ padding: "var(--space-5)", color: "var(--text-main)", lineHeight: 1.7, fontSize: "0.95rem" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)", marginBottom: "6px" }}>
            Conditions Générales d'Utilisation
          </h1>
          <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>
            Réservation et paiement en ligne — Dernière mise à jour : {LAST_UPDATE}
          </p>

          <nav aria-label="Sommaire" style={{ background: "rgba(139,28,34,0.05)", border: "1px solid var(--border)", borderRadius: "12px", padding: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            <strong style={{ display: "block", marginBottom: "8px" }}>Sommaire</strong>
            <ol style={{ listStyle: "none", padding: 0, display: "grid", gap: "4px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.9rem" }}>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {sections.map((s) => (
            <section key={s.id} id={s.id} style={{ marginBottom: "var(--space-4)", scrollMarginTop: "16px" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "var(--space-2)", paddingBottom: "6px", borderBottom: "1px solid var(--border)" }}>
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </main>

        <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "var(--space-3)" }}>
          &copy; {new Date().getFullYear()} Royal Tennis Club de Mohammédia. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}

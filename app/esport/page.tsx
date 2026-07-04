import Link from 'next/link';
import CompetitiveNav from '@/components/CompetitiveNav';
import LocalizedSafariBar from '@/components/LocalizedSafariBar';
import { withLocalePath } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/requestLocale';
import { getSiteControls } from '@/lib/siteControls';

export const metadata = {
  title: 'Warzone Esport - WZPRO Meta',
  description: 'Conversation-style guide for starting Warzone tournaments, finding platforms, Discords, scrims, and understanding the competitive circuit.',
};

const defaultTournamentSources = [
  { name: 'CheckMate Gaming', type: 'Cash tournaments', url: 'https://www.checkmategaming.com/de/tournament/cross-platform/warzone', note: 'Wagers, ladders, kill races, solo/duo/trio/quads formats, and cash prizes depending on open events.' },
  { name: 'Console Kings', type: 'Daily tournaments', url: 'https://www.consolekings.com/', note: 'Esports platform with Warzone tournaments, Resurgence Kill Race, cash prizes, and NA+EU regions depending on open events.' },
  { name: 'Repeat.gg', type: 'Leaderboards', url: 'https://support.repeat.gg/hc/en-us/sections/38087540602139-Call-of-Duty-Warzone', note: 'Automated tournaments and challenges, useful for starting solo with less pressure.' },
  { name: 'Battlefy', type: 'Tournament search', url: 'https://help.battlefy.com/en/articles/6950799-finding-tournaments-for-you', note: 'Directory and filters for finding competitions organized by communities or organizations.' },
  { name: 'Challengermode', type: 'Community events', url: 'https://www.challengermode.com/', note: 'Platform to monitor for ladders, community cups, and sponsored events.' },
  { name: 'FACEIT', type: 'Competitive hubs', url: 'https://www.faceit.com/', note: 'Less central for Warzone, but useful for hubs, partner events, or private circuits.' },
  { name: 'Toornament', type: 'Brackets and events', url: 'https://play.toornament.com/en_US/tournaments/', note: 'Tool used by associations, communities, and independent organizers.' },
  { name: 'Tournex', type: 'Warzone hub', url: 'https://app.tournex.it/', note: 'Tournaments, player profiles, teams, live rankings, and ranked-season logic.' },
  { name: 'FHD Tournaments', type: 'Community tournaments', url: 'https://fhdtournaments.com/', note: 'Community Warzone page with rules, support, Discord/email, and a non-affiliation notice.' },
  { name: 'GamerSaloon', type: 'Cash challenges', url: 'https://www.gamersaloon.com/cod/', note: 'Call of Duty/Warzone challenges and tournaments depending on open offers.' },
];

const defaultDiscordSources = [
  { name: 'Call of Duty: Warzone Discord', url: 'https://discord.com/servers/560422033171808256', note: 'Large public server for LFG, ranked, loadouts, discussion, and first competitive contacts.' },
  { name: 'NA Practice Scrims', url: 'https://discord.com/servers/na-practice-scrims-778438158605615115', note: 'NA server focused on practice customs, scrims, money scrims, player search, and tournament prep.' },
  { name: 'GameFace Warzone Tournaments', url: 'https://discord.com/invite/R4UEUAuesg', note: 'Warzone community with automated tournaments, skill divisions, leaderboards, and cash prizes.' },
  { name: 'COD Central', url: 'https://top.gg/discord/servers/543757449606406149', note: 'Call of Duty/Warzone server useful for finding ranked teammates and daily grind partners.' },
  { name: 'Tournex - Discord Tornei', url: 'https://discord.gg/sMGPMvbdyT', note: 'Discord listed by Tournex for following their Warzone tournaments.' },
];

const defaultStarterSteps = [
  'Stabilize your setup: FPS, audio, sensitivity, connection, and no crashes.',
  'Grind ranked to learn rotations, timings, and fights under pressure.',
  'Start with free or low buy-in kill races and leaderboards.',
  'Find a regular duo or trio instead of playing every tournament with randoms.',
  'Join scrim Discords, read the rules, and show up for check-ins.',
  'Review your deaths, write down your mistakes, then queue again. Consistency matters more than one good night.',
];

const roadmap = [
  ['01', 'Public matches', 'mechanical basics, aim, movement, confidence'],
  ['02', 'Serious ranked', 'rotations, pressure, real fights, teammates'],
  ['03', 'Small tournaments', 'rules, check-in, scoring, proof'],
  ['04', 'Small cash prizes', 'playing cleanly with stakes'],
  ['05', 'Private customs', 'more disciplined lobbies, prepared teams'],
  ['06', 'Regular scrims', 'network, reputation, stable roster'],
  ['07', 'Official qualifiers', 'WSOW, EWC, regional open qualifiers'],
  ['08', 'LAN / major events', 'showcase level, audience, consistent results'],
];

const formats = [
  { name: 'Kill Race', note: 'The most accessible format: you have a time window or a set number of games to get as many kills as possible.' },
  { name: 'Leaderboard', note: 'The platform keeps your best games. Great for starting solo and understanding scoring.' },
  { name: 'Customs', note: 'Private lobby with registered players. Closer to serious competition because everyone plays the same lobby.' },
  { name: 'Scrims', note: 'Practice sessions organized through Discords. This is where teams recruit and players get noticed.' },
];

const platformAdvice = [
  { name: 'Tournex', route: 'Tournament -> team -> lobby/custom', note: 'Interesting for teams, live rankings, and competitive hub structure.' },
  { name: 'Discords', route: 'Rules -> announcement -> support ticket', note: 'Essential for scrims, LFG, customs, and competitive networking.' },
];

const moneyReality = [
  'At first, do not chase money. Chase tournament experience.',
  'Early winnings are often small: 20, 50, 100, and sometimes nothing for a long time.',
  'Players who last often combine competition, streaming, clips, coaching, sponsors, or an org.',
  'Your first real goal: become reliable enough to get invited into serious customs.',
];

const ecosystemReality = [
  'GameBattles shut down in January 2024, so part of the old COD center disappeared.',
  'The scene became more Discord-driven, more network-based, more customs-focused, and more content-driven.',
  'Activision has more control over major official events, rights, image, sponsors, and rules.',
  'Warzone is hard to turn into an esport: loot, zones, servers, meta, crossplay, and cheating make the amateur layer more fragile.',
];

const esStarterSteps = [
  'Estabiliza tu setup: FPS, audio, sensibilidad, conexion y cero crasheos.',
  'Grindea ranked para aprender rotaciones, timings y peleas bajo presion.',
  'Empieza con kill races gratis o baratas y tablas de clasificacion.',
  'Encuentra un duo o trio fijo en vez de jugar cada torneo con randoms.',
  'Unete a Discords de scrims, lee las reglas y presentate a los check-ins.',
  'Revisa tus muertes, anota tus errores y vuelve a cola. La consistencia importa mas que una buena noche.',
];

const esRoadmap = [
  ['01', 'Partidas publicas', 'bases mecanicas, aim, movimiento, confianza'],
  ['02', 'Ranked serio', 'rotaciones, presion, peleas reales, companeros'],
  ['03', 'Torneos pequenos', 'reglas, check-in, puntuacion, pruebas'],
  ['04', 'Premios pequenos', 'jugar limpio con algo en juego'],
  ['05', 'Customs privados', 'lobbies mas disciplinados, equipos preparados'],
  ['06', 'Scrims regulares', 'red, reputacion, roster estable'],
  ['07', 'Clasificatorios oficiales', 'WSOW, EWC, open qualifiers regionales'],
  ['08', 'LAN / eventos mayores', 'nivel showcase, audiencia, resultados constantes'],
];

const esFormats = [
  { name: 'Kill Race', note: 'El formato mas accesible: tienes una ventana de tiempo o un numero de partidas para conseguir la mayor cantidad de kills.' },
  { name: 'Leaderboard', note: 'La plataforma conserva tus mejores partidas. Ideal para empezar solo y entender la puntuacion.' },
  { name: 'Customs', note: 'Lobby privado con jugadores registrados. Mas cercano a la competicion seria porque todos juegan el mismo lobby.' },
  { name: 'Scrims', note: 'Practicas organizadas por Discords. Ahi los equipos reclutan y los jugadores se hacen notar.' },
];

const esPlatformAdvice = [
  { name: 'Tournex', route: 'Torneo -> equipo -> lobby/custom', note: 'Interesante para equipos, rankings en vivo y estructura de hub competitivo.' },
  { name: 'Discords', route: 'Reglas -> anuncio -> ticket soporte', note: 'Esencial para scrims, LFG, customs y networking competitivo.' },
];

const esMoneyReality = [
  'Al principio, no persigas dinero. Persigue experiencia de torneo.',
  'Las primeras ganancias suelen ser pequenas: 20, 50, 100, y a veces nada durante mucho tiempo.',
  'Los jugadores que duran combinan competicion, stream, clips, coaching, sponsors u organizacion.',
  'Tu primer objetivo real: volverte lo bastante fiable para que te inviten a customs serios.',
];

const esEcosystemReality = [
  'GameBattles cerro en enero de 2024, asi que una parte del antiguo centro COD desaparecio.',
  'La escena se volvio mas dependiente de Discord, mas basada en contactos, customs y contenido.',
  'Activision controla mas los grandes eventos oficiales, derechos, imagen, sponsors y reglas.',
  'Warzone es dificil como esport: loot, zonas, servidores, meta, crossplay y trampas hacen mas fragil la capa amateur.',
];

const frStarterSteps = [
  'Stabilise ton setup : FPS, audio, sensibilite, connexion et zero crash.',
  'Grind la ranked pour apprendre les rotations, timings et fights sous pression.',
  'Commence par des kill races gratuites ou peu cheres et des classements.',
  'Trouve un duo ou trio regulier au lieu de jouer chaque tournoi avec des randoms.',
  'Rejoins des Discords de scrims, lis les regles et sois present aux check-ins.',
  'Revois tes morts, note tes erreurs, puis relance. La constance compte plus qu une seule bonne soiree.',
];

const frRoadmap = [
  ['01', 'Parties publiques', 'bases mecaniques, aim, mouvement, confiance'],
  ['02', 'Ranked serieuse', 'rotations, pression, vrais fights, coequipiers'],
  ['03', 'Petits tournois', 'regles, check-in, scoring, preuves'],
  ['04', 'Petits cash prizes', 'jouer proprement avec de l enjeu'],
  ['05', 'Customs prives', 'lobbies plus disciplines, equipes preparees'],
  ['06', 'Scrims reguliers', 'reseau, reputation, roster stable'],
  ['07', 'Qualifiers officiels', 'WSOW, EWC, qualifiers ouverts regionaux'],
  ['08', 'LAN / grands events', 'niveau showcase, audience, resultats constants'],
];

const frFormats = [
  { name: 'Kill Race', note: 'Le format le plus accessible : tu as une fenetre de temps ou un nombre de games pour faire le plus de kills possible.' },
  { name: 'Classement', note: 'La plateforme garde tes meilleures parties. Ideal pour commencer solo et comprendre le scoring.' },
  { name: 'Customs', note: 'Lobby prive avec joueurs inscrits. Plus proche de la competition serieuse car tout le monde joue le meme lobby.' },
  { name: 'Scrims', note: 'Sessions d entrainement organisees via Discord. C est la que les equipes recrutent et que les joueurs se font remarquer.' },
];

const frPlatformAdvice = [
  { name: 'Tournex', route: 'Tournoi -> equipe -> lobby/custom', note: 'Interessant pour les teams, les rankings live et une structure de hub competitif.' },
  { name: 'Discords', route: 'Regles -> annonce -> ticket support', note: 'Essentiel pour scrims, LFG, customs et reseau competitif.' },
];

const frMoneyReality = [
  'Au debut, ne poursuis pas l argent. Poursuis l experience de tournoi.',
  'Les premiers gains sont souvent petits : 20, 50, 100, et parfois rien pendant longtemps.',
  'Les joueurs qui durent combinent competition, stream, clips, coaching, sponsors ou org.',
  'Ton premier vrai objectif : devenir assez fiable pour etre invite dans des customs serieux.',
];

const frEcosystemReality = [
  'GameBattles a ferme en janvier 2024, donc une partie de l ancien centre COD a disparu.',
  'La scene est devenue plus dependante de Discord, plus basee sur le reseau, les customs et le contenu.',
  'Activision controle davantage les grands events officiels, droits, image, sponsors et regles.',
  'Warzone est difficile a transformer en esport : loot, zones, serveurs, meta, crossplay et triche fragilisent la couche amateur.',
];

function PlayerBubble({ children }: { children: React.ReactNode }) {
  return (
    <article className="chat-row chat-row--player">
      <div className="chat-avatar" aria-hidden="true"><span /></div>
      <div className="chat-bubble chat-bubble--player">
        <span>PLAYER</span>
        <p>{children}</p>
      </div>
    </article>
  );
}

function WzBubble({ children }: { children: React.ReactNode }) {
  return (
    <article className="chat-row chat-row--wz">
      <div className="chat-bubble chat-bubble--wz">
        <span>WZPRO</span>
        {children}
      </div>
    </article>
  );
}

export default async function EsportPage() {
  const locale = await getRequestLocale();
  const href = (path: string) => withLocalePath(path, locale);
  const { esport } = await getSiteControls();
  const starterSteps = esport.starterSteps.length ? esport.starterSteps : defaultStarterSteps;
  const tournamentSources = esport.tournamentSources.length ? esport.tournamentSources : defaultTournamentSources;
  const discordSources = esport.discordSources.length ? esport.discordSources : defaultDiscordSources;
  const localizedStarterSteps = locale === 'fr' ? frStarterSteps : locale === 'es' ? esStarterSteps : starterSteps;
  const localizedRoadmap = locale === 'fr' ? frRoadmap : locale === 'es' ? esRoadmap : roadmap;
  const localizedFormats = locale === 'fr' ? frFormats : locale === 'es' ? esFormats : formats;
  const localizedPlatformAdvice = locale === 'fr' ? frPlatformAdvice : locale === 'es' ? esPlatformAdvice : platformAdvice;
  const localizedMoneyReality = locale === 'fr' ? frMoneyReality : locale === 'es' ? esMoneyReality : moneyReality;
  const localizedEcosystemReality = locale === 'fr' ? frEcosystemReality : locale === 'es' ? esEcosystemReality : ecosystemReality;

  return (
    <>
      <div className="pt-technical-backdrop" aria-hidden="true" />

      <LocalizedSafariBar
        active="esport"
        searchPlaceholder={locale === 'es' ? 'Competicion, torneos, Discords' : locale === 'fr' ? 'Competition, tournois, Discords' : 'Competition, tournaments, Discords'}
        readout={['COMPETITION // WARZONE', 'GUIDE: CONVERSATION', 'STATUS: LIVE']}
      />

      <CompetitiveNav active="calendar" />

      <main className="esport-main">
        <header className="esport-hero">
          <div className="pt-header-tag">{locale === 'es' ? 'INTELIGENCIA COMPETITIVA' : locale === 'fr' ? 'RENSEIGNEMENT COMPETITIF' : 'COMPETITIVE INTELLIGENCE'}</div>
          <h1>{locale === 'es' ? 'ESPORT WARZONE' : 'WARZONE ESPORT'}</h1>
          <p>{locale === 'es' ? 'Una pagina tipo conversacion para entender como entrar en torneos Warzone, encontrar plataformas, unirse a Discords y avanzar hacia scrims.' : locale === 'fr' ? 'Une page en conversation pour comprendre comment entrer dans les tournois Warzone, trouver les plateformes, rejoindre des Discords et progresser vers les scrims.' : 'A page built like a conversation to understand how to enter Warzone tournaments, find the right sites, join Discords, and progress toward scrims.'}</p>
        </header>

        <section className="chat-thread" aria-label="Guided conversation about Warzone tournaments">
          <PlayerBubble>{locale === 'es' ? 'Por donde empiezo si quiero jugar torneos Warzone?' : locale === 'fr' ? 'Par ou commencer pour jouer des tournois Warzone ?' : 'Where should I start if I want to play Warzone tournaments?'}</PlayerBubble>
          <WzBubble>
            <p>{locale === 'es' ? 'Empieza como grinder, no como pro. Primero necesitas consistencia: ranked, setup estable, mental solido y luego torneos abiertos pequenos.' : locale === 'fr' ? 'Commence comme un grinder, pas comme un pro. Il te faut d abord de la constance: ranked, setup stable, mental solide, puis petits tournois ouverts.' : 'Start like a grinder, not like a pro. First you need consistency: ranked, stable setup, solid mental, then small open tournaments.'}</p>
            <div className="chat-list">
              {localizedStarterSteps.map((step, index) => (
                <div key={step}><b>{String(index + 1).padStart(2, '0')}</b><strong>{step}</strong></div>
              ))}
            </div>
          </WzBubble>

          <PlayerBubble>{locale === 'es' ? 'Cual es el camino real hacia el circuito competitivo?' : locale === 'fr' ? 'Quel est le vrai chemin vers le circuit competitif ?' : 'What is the real path into the competitive circuit?'}</PlayerBubble>
          <WzBubble>
            <p>{locale === 'es' ? 'El camino moderno casi nunca es directo. Subes por capas: nivel, red, resultados, visibilidad y luego clasificatorios.' : locale === 'fr' ? 'Le chemin moderne est rarement direct. Tu montes par couches: niveau, reseau, resultats, visibilite, puis qualifiers.' : 'The modern path is almost never direct. You climb in layers: skill level, network, results, visibility, then qualifiers.'}</p>
            <div className="roadmap-grid">
              {localizedRoadmap.map(([num, title, note]) => (
                <div key={title}>
                  <b>{num}</b>
                  <strong>{title}</strong>
                  <small>{note}</small>
                </div>
              ))}
            </div>
          </WzBubble>

          <PlayerBubble>{locale === 'es' ? 'Que formatos deberia jugar al principio?' : locale === 'fr' ? 'Quels formats viser au debut ?' : 'Which formats should I target at the beginning?'}</PlayerBubble>
          <WzBubble>
            <p>{locale === 'es' ? 'Los mejores formatos para empezar te ensenan las reglas sin lanzarte directo a lobbies privados grandes.' : locale === 'fr' ? 'Les meilleurs formats pour commencer t apprennent les regles sans t envoyer directement dans de gros lobbies prives.' : 'The best beginner formats teach you the rules without throwing you straight into major private lobbies.'}</p>
            <div className="mini-card-grid">
              {localizedFormats.map((format) => (
                <div key={format.name}>
                  <strong>{format.name}</strong>
                  <p>{format.note}</p>
                </div>
              ))}
            </div>
          </WzBubble>

          <PlayerBubble>{locale === 'es' ? 'Dame los sitios que listan competiciones de Warzone.' : locale === 'fr' ? 'Donne-moi les sites qui listent les competitions Warzone.' : 'Give me the sites that list Warzone competitions.'}</PlayerBubble>
          <WzBubble>
            <p>{locale === 'es' ? 'Estas son las plataformas a vigilar. Los torneos cambian a menudo, asi que verifica siempre fecha, region, reglas, pago, anti-cheat y reembolsos.' : locale === 'fr' ? 'Voici les plateformes a surveiller. Les tournois changent souvent, donc verifie toujours date, region, regles, paiement, anti-cheat et remboursements.' : 'Here are the platforms to monitor. Tournaments change often, so always verify date, region, rules, payment, anti-cheat, and refunds.'}</p>
            <div className="source-grid">
              {tournamentSources.map((source) => (
                <a key={source.name} href={source.url} target="_blank" rel="noreferrer">
                  <span>{source.type}</span>
                  <strong>{source.name}</strong>
                  <p>{source.note}</p>
                </a>
              ))}
            </div>
          </WzBubble>

          <PlayerBubble>{locale === 'es' ? 'Lista Discords utiles para grindear, sobre todo en NA.' : locale === 'fr' ? 'Liste des Discords utiles pour grind, surtout en NA.' : 'List useful Discords for grinding, especially in NA.'}</PlayerBubble>
          <WzBubble>
            <p>{locale === 'es' ? 'Para el grind NA, Discord es esencial: LFG, squads ranked, scrims, customs, anuncios, check-ins y soporte suelen pasar por ahi.' : locale === 'fr' ? 'Pour le grind NA, Discord est essentiel : LFG, squads ranked, scrims, customs, annonces, check-ins et support passent souvent par la.' : 'For the NA grind, Discord is essential: LFG, ranked stacks, scrims, customs, announcements, check-ins, and support tickets often go through there.'}</p>
            <div className="source-grid source-grid--discord">
              {discordSources.map((source) => (
                <a key={source.name} href={source.url} target="_blank" rel="noreferrer">
                  <span>Discord</span>
                  <strong>{source.name}</strong>
                  <p>{source.note}</p>
                </a>
              ))}
            </div>
          </WzBubble>

          <PlayerBubble>{locale === 'es' ? 'Que plataforma deberia elegir primero?' : locale === 'fr' ? 'Quelle plateforme choisir en premier ?' : 'Which platform should I choose first?'}</PlayerBubble>
          <WzBubble>
            <p>{locale === 'es' ? 'Elige segun tu objetivo. Si quieres aprender sin presion, apunta a leaderboards o kill races. Si quieres el ritmo competitivo real, busca scrims y customs.' : locale === 'fr' ? 'Choisis selon ton objectif. Si tu veux apprendre sans pression, vise les classements ou kill races. Si tu veux le vrai rythme competitif, cherche scrims et customs.' : 'Choose based on your goal. If you want to learn without pressure, target leaderboards or kill races. If you want the real competitive rhythm, look for scrims and customs.'}</p>
            <div className="platform-grid">
              {localizedPlatformAdvice.map((item) => (
                <div key={item.name}>
                  <span>{item.route}</span>
                  <strong>{item.name}</strong>
                  <p>{item.note}</p>
                </div>
              ))}
            </div>
          </WzBubble>

          <PlayerBubble>{locale === 'es' ? 'Por que la escena parece cerrada desde GameBattles?' : locale === 'fr' ? 'Pourquoi la scene semble fermee depuis GameBattles ?' : 'Why does the scene feel closed since GameBattles?'}</PlayerBubble>
          <WzBubble>
            <p>{locale === 'es' ? 'Porque el ecosistema cambio. La habilidad importa, pero tambien necesitas ser visible, estar presente y ser conocido en los servidores correctos.' : locale === 'fr' ? 'Parce que l ecosysteme a change. Le niveau compte toujours, mais il faut aussi etre visible, present et connu sur les bons serveurs.' : 'Because the ecosystem changed. Skill still matters, but you also need to be visible, present, and known in the right servers.'}</p>
            <ul className="chat-bullets">
              {localizedEcosystemReality.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </WzBubble>

          <PlayerBubble>{locale === 'es' ? 'Se puede ganar dinero rapido?' : locale === 'fr' ? 'Est-ce qu on peut gagner de l argent rapidement ?' : 'Can you make money quickly?'}</PlayerBubble>
          <WzBubble>
            <p>{locale === 'es' ? 'Es posible, pero no es el objetivo correcto al principio. El primer objetivo es entrar en buenos customs y ser un jugador fiable.' : locale === 'fr' ? 'C est possible, mais ce n est pas le bon objectif au debut. Le premier objectif est d entrer dans de bons customs et devenir un joueur fiable.' : 'Possible, but it is not the right goal at the beginning. The first goal is to get invited into good customs and become a reliable player.'}</p>
            <ul className="chat-bullets">
              {localizedMoneyReality.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </WzBubble>

          <PlayerBubble>{locale === 'es' ? 'Entonces cual es mi primer objetivo real?' : locale === 'fr' ? 'Donc quel est mon premier vrai objectif ?' : 'So what is my first real goal?'}</PlayerBubble>
          <WzBubble>
            <p className="final-answer">{locale === 'es' ? 'Vuelvete lo bastante fuerte, constante y fiable para que te inviten a customs serios. Desde ahi conoces la escena competitiva real: scrims, buenos rosters, pequenos premios y luego clasificatorios oficiales.' : locale === 'fr' ? 'Deviens assez fort, constant et fiable pour que les gens t invitent dans des customs serieux. A partir de la, tu rencontres la vraie scene competitive : scrims, bons rosters, petits cash prizes, puis qualifiers officiels.' : 'Become strong, consistent, and reliable enough that people invite you into serious customs. From there, you meet the real competitive scene: scrims, good rosters, small cash prizes, then official qualifiers.'}</p>
            <Link className="chat-cta" href={href('/pro-tools')}>{locale === 'es' ? 'Ver Herramientas Pro' : locale === 'fr' ? 'Voir les Outils Pro' : 'View Pro Tools'}</Link>
          </WzBubble>
        </section>

        <section className="references-callout">
          <div>
            <span>{locale === 'es' ? 'DIRECTORIO DE ENLACES' : locale === 'fr' ? 'ANNUAIRE DE LIENS' : 'LINK DIRECTORY'}</span>
            <h2>{locale === 'es' ? 'Necesitas enlaces directos?' : locale === 'fr' ? 'Besoin de liens directs ?' : 'Need direct links?'}</h2>
            <p>{locale === 'es' ? 'Encuentra sitios de torneos, Discords NA, scrims, plataformas y recursos oficiales en una pagina separada.' : locale === 'fr' ? 'Trouve les sites de tournois, Discords NA, scrims, plateformes et ressources officielles sur une page separee.' : 'Find tournament sites, NA Discords, scrims, platforms, and official resources on a separate page.'}</p>
          </div>
          <Link href={href('/esport/references')}>{locale === 'es' ? 'Referencias' : locale === 'fr' ? 'References' : 'References'}</Link>
        </section>
      </main>

      <style>{`
        .esport-main {
          max-width: 1180px;
          margin: 0 auto;
          padding: 5rem 2rem 6rem;
          color: #10100e;
          font-family: var(--font-mono, monospace);
        }

        .esport-hero {
          max-width: 930px;
          margin-bottom: 2rem;
        }

        .esport-hero h1 {
          margin: 0.35rem 0 1rem;
          font-size: clamp(3.8rem, 10vw, 9rem);
          line-height: 0.82;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .esport-hero p,
        .chat-bubble p,
        .chat-bullets,
        .source-grid p,
        .mini-card-grid p,
        .platform-grid p {
          color: rgba(16,16,14,0.68);
          font-size: 0.86rem;
          line-height: 1.65;
        }

        .chat-thread {
          display: grid;
          gap: 1rem;
        }

        .chat-row {
          display: grid;
          gap: 0.75rem;
          align-items: start;
        }

        .chat-row--player {
          grid-template-columns: 58px minmax(240px, 640px);
          justify-content: start;
        }

        .chat-row--wz {
          grid-template-columns: minmax(260px, 920px);
          justify-content: end;
        }

        .chat-avatar {
          display: grid;
          width: 58px;
          height: 58px;
          place-items: center;
          background: rgba(239,238,232,0.72);
          border: 1px solid rgba(16,16,14,0.14);
        }

        .chat-avatar span {
          display: block;
          width: 32px;
          height: 32px;
          border: 2px solid #10100e;
          border-radius: 999px;
          position: relative;
        }

        .chat-avatar span::before {
          position: absolute;
          inset: 6px 9px auto;
          height: 7px;
          border: 2px solid #10100e;
          border-radius: 999px;
          content: "";
        }

        .chat-avatar span::after {
          position: absolute;
          left: 6px;
          right: 6px;
          bottom: 5px;
          height: 10px;
          border: 2px solid #10100e;
          border-radius: 999px 999px 0 0;
          content: "";
        }

        .chat-bubble {
          position: relative;
          padding: 1rem 1.15rem;
          border: 1px solid rgba(16,16,14,0.14);
          background: rgba(239,238,232,0.72);
        }

        .chat-bubble--wz {
          background: #10100e;
          color: #efeee8;
        }

        .chat-bubble > span {
          display: block;
          margin-bottom: 0.75rem;
          color: #163cff;
          font-size: 0.68rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .chat-bubble--wz > span {
          color: #7f96ff;
        }

        .chat-bubble--player p {
          margin: 0;
          color: #10100e;
          font-size: clamp(1rem, 2vw, 1.45rem);
          font-weight: 900;
          line-height: 1.2;
        }

        .chat-bubble--wz p,
        .chat-bubble--wz .chat-bullets {
          color: rgba(239,238,232,0.78);
        }

        .chat-list,
        .roadmap-grid,
        .mini-card-grid,
        .source-grid,
        .platform-grid {
          display: grid;
          gap: 1px;
          margin-top: 1rem;
          background: rgba(239,238,232,0.18);
        }

        .chat-list div,
        .roadmap-grid div,
        .mini-card-grid div,
        .platform-grid div,
        .source-grid a {
          display: grid;
          gap: 0.55rem;
          min-height: 130px;
          padding: 1rem;
          background: rgba(239,238,232,0.08);
          color: #efeee8;
          text-decoration: none;
        }

        .chat-list div {
          grid-template-columns: 42px minmax(0, 1fr);
          align-items: start;
          min-height: auto;
        }

        .chat-list b,
        .roadmap-grid b,
        .source-grid span,
        .platform-grid span {
          color: #7f96ff;
          font-size: 0.72rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .chat-list strong,
        .roadmap-grid strong,
        .mini-card-grid strong,
        .platform-grid strong,
        .source-grid strong {
          color: #efeee8;
          font-size: 1rem;
          line-height: 1.05;
          text-transform: uppercase;
        }

        .roadmap-grid,
        .source-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .mini-card-grid,
        .platform-grid,
        .source-grid--discord {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .roadmap-grid small {
          color: rgba(239,238,232,0.64);
          line-height: 1.45;
        }

        .source-grid a:hover {
          background: rgba(239,238,232,0.16);
        }

        .chat-bullets {
          margin: 1rem 0 0;
          padding: 0;
          list-style: none;
        }

        .chat-bullets li {
          padding: 0.85rem 0;
          border-top: 1px solid rgba(239,238,232,0.18);
        }

        .final-answer {
          color: #efeee8 !important;
          font-size: clamp(1.05rem, 2vw, 1.45rem) !important;
          font-weight: 900;
          line-height: 1.35 !important;
        }

        .chat-cta {
          display: inline-grid;
          width: fit-content;
          min-height: 46px;
          place-items: center;
          margin-top: 1rem;
          padding: 0 1rem;
          border: 1px solid rgba(239,238,232,0.72);
          color: #efeee8;
          font-size: 0.78rem;
          font-weight: 900;
          text-decoration: none;
          text-transform: uppercase;
        }

        .chat-cta:hover {
          background: #efeee8;
          color: #10100e;
        }

        .references-callout {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 2rem;
          margin-top: 3rem;
          padding: 1.4rem;
          border: 2px solid #10100e;
          background: rgba(239,238,232,0.72);
        }

        .references-callout span {
          color: #163cff;
          font-size: 0.7rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .references-callout h2 {
          margin: 0.6rem 0 0.5rem;
          font-size: clamp(1.8rem, 4vw, 4rem);
          line-height: 0.9;
          text-transform: uppercase;
        }

        .references-callout p {
          max-width: 680px;
          margin: 0;
          color: rgba(16,16,14,0.68);
          font-size: 0.86rem;
          line-height: 1.65;
        }

        .references-callout a {
          display: inline-grid;
          min-height: 56px;
          min-width: 180px;
          place-items: center;
          padding: 0 1.3rem;
          background: #10100e;
          color: #efeee8;
          font-size: 0.9rem;
          font-weight: 900;
          text-decoration: none;
          text-transform: uppercase;
        }

        .references-callout a:hover {
          background: #163cff;
        }

        .chat-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .chat-actions .chat-cta {
          margin-top: 0;
        }

        .chat-cta--refs {
          border-color: #7f96ff;
          color: #7f96ff;
        }

        @media (max-width: 900px) {
          .chat-row--player,
          .chat-row--wz {
            grid-template-columns: 1fr;
          }

          .chat-avatar {
            display: none;
          }

          .roadmap-grid,
          .mini-card-grid,
          .source-grid,
          .source-grid--discord,
          .platform-grid {
            grid-template-columns: 1fr;
          }

          .references-callout {
            display: grid;
          }
        }
      `}</style>
    </>
  );
}
